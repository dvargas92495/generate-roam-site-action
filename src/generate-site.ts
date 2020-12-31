import {error, getInput, info} from "@actions/core";
import puppeteer from "puppeteer";
import path from "path";
import watch from "node-watch";
import fs from "fs";
import jszip from "jszip";
import marked from "marked";

const CONFIG_PAGE_NAME = "roam/js/public-garden";

type Config = {
    index: string;
    titleFilter: (title: string) => boolean;
    contentFilter: (content: string) => string;
    template: string;
};

const extractTag = (tag: string): string =>
    tag.startsWith("#[[") && tag.endsWith("]]")
        ? tag.substring(3, tag.length - 2)
        : tag.startsWith("[[") && tag.endsWith("]]")
        ? tag.substring(2, tag.length - 2)
        : tag.startsWith("#")
            ? tag.substring(1)
            : tag;

export const defaultConfig = {
    index: "Website Index",
    titleFilter: (title: string): boolean => title !== `${CONFIG_PAGE_NAME}.md`,
    contentFilter: (c: string): string => c,
    removeTag: false,
    template: `<!doctype html>
                <html>
                <head>
                    <meta charset="utf-8"/>
                    <title>$\{PAGE_NAME}</title>
                </head>
                <body>
                    <div id="content">
                    $\{PAGE_CONTENT}
                    </div>
                </body>
                </html>`,
};

type Node = {
    text: string;
    children: Node[];
};

const getTitleRuleFromNode = (n: Node) => {
    const {text, children} = n;
    if (text.trim().toUpperCase() === "STARTS WITH" && children.length) {
        return (title: string) => title.startsWith(extractTag(children[0].text));
    } else {
        return defaultConfig.titleFilter;
    }
};

const deleteLine = (c: string, tag: string) => {
    const new_content: string[] = []
    c.split('\n').forEach((line) => {
            if (!line.includes(tag)) {
                new_content.push(line)
            }
        }
    )
    return new_content.join('\n')
}

const checkTag = (c: string, tag: string | null, removeTag: boolean) => {
    if (c.includes(`#${tag}`) || c.includes(`[[${tag}]]`) || c.includes(`${tag}::`)) {
        if (!removeTag || !tag) {
            return c
        }
        let content = ""
        for (const t of [`#${tag}`, `[[${tag}]]`, `${tag}::`]) {
            if (c.includes(t)) {
                content = deleteLine(c, t)
                break
            }
        }
        return content
    }
    return ""
};

const getContentRuleFromNode = (n: Node,) => {
    const {text, children} = n;
    if (text.trim().toUpperCase() === "TAGGED WITH" && children.length) {
        return extractTag(children[0].text);
    }
    return null
};

const getConfigFromPage = async (page: jszip.JSZipObject) => {
    const content = await page.async("text");
    const contentParts = content.split("\n");
    const parsedTree: Node[] = [];
    let currentNode = {children: parsedTree};
    let currentIndent = 0;
    for (const text of contentParts) {
        const node = {text: text.substring(text.indexOf("- ") + 2), children: []};
        const indent = text.indexOf("- ") / 4;
        if (indent < 0) {
            const lastNode = currentNode.children[currentNode.children.length - 1];
            lastNode.text = `${lastNode.text}\n${text}`;
        } else if (indent === currentIndent) {
            currentNode.children.push(node);
        } else if (indent > currentIndent) {
            currentNode = currentNode.children[currentNode.children.length - 1];
            currentNode.children.push(node);
            currentIndent = indent;
        } else {
            currentNode = {children: parsedTree};
            for (let i = 1; i < indent; i++) {
                currentNode = currentNode.children[currentNode.children.length - 1];
            }
            currentIndent = indent;
            currentNode.children.push(node);
        }
    }

    const getConfigNode = (key: string) =>
        parsedTree.find((n) => n.text.trim().toUpperCase() === key.toUpperCase());
    const indexNode = getConfigNode("index");
    const filterNode = getConfigNode("filter");
    const templateNode = getConfigNode("template");
    const template = (templateNode?.children || [])
        .map((s) => s.text.match(new RegExp("```html\n(.*)```", "s")))
        .find((s) => !!s)?.[1];
    const withIndex: Partial<Config> = indexNode?.children?.length
        ? {index: extractTag(indexNode.children[0].text.trim())}
        : {};
    const removeContentFilter = !!filterNode?.children[0].children[0]?.children[0]?.text?.toLowerCase()
        .replace(/\s/g, '').includes("writetag=false")

    const withFilter: Partial<Config> = {}
    if (filterNode?.children?.length) {
        const tag: string | null = filterNode.children.map(getContentRuleFromNode).filter((c) => !!c)[0]
        withFilter.titleFilter = (t: string) => t === withIndex.index ||
            filterNode.children.map(getTitleRuleFromNode).some((r) => r(t))
        withFilter.contentFilter = (c: string) => checkTag(c, tag, removeContentFilter)
    }
    const withTemplate: Partial<Config> = template
        ? {
            template,
        }
        : {};
    return {
        ...withIndex,
        ...withFilter,
        ...withTemplate,
    };
};

const convertPageToName = (p: string) =>
    p.substring(0, p.length - ".md".length);

const convertPageToHtml = ({name, index}: { name: string; index: string }) =>
    name === index
        ? "index.html"
        : `${encodeURIComponent(name.replace(/ /g, "_"))}.html`;

const prepareContent = ({
                            content,
                            pageNames,
                            index,
                        }: {
    content: string;
    pageNames: string[];
    index: string;
}) => {
    let ignoreIndent = -1;
    let codeBlockIndent = -1;
    const pageViewedAsDocument = !content.startsWith("- ");
    const filteredContent = content
        .split("\n")
        .filter((l) => {
            const numSpaces = l.search(/\S/);
            const indent = numSpaces / 4;
            if (ignoreIndent >= 0 && indent > ignoreIndent) {
                return false;
            }
            const bullet = l.substring(numSpaces);
            const text = bullet.startsWith("- ") ? bullet.substring(2) : bullet;
            const isIgnore = extractTag(text.trim()) === `${CONFIG_PAGE_NAME}/ignore`;
            if (isIgnore) {
                ignoreIndent = indent;
                return false;
            }
            ignoreIndent = -1;
            return true;
        })
        .map((s, i) => {
            if (s.trimStart().startsWith("- ")) {
                const numSpaces = s.search(/\S/);
                const normalizeS = pageViewedAsDocument ? s.substring(4) : s;
                const text = s.substring(numSpaces + 2);
                if (text.startsWith("```")) {
                    codeBlockIndent = numSpaces / 4;
                    return `${normalizeS.substring(
                        0,
                        normalizeS.length - text.length
                    )}\n`;
                }
                return normalizeS;
            }
            if (codeBlockIndent > -1) {
                const indent = "".padStart((codeBlockIndent + 2) * 4, " ");
                if (s.endsWith("```")) {
                    codeBlockIndent = -1;
                    return `${indent}${s.substring(0, s.length - 3)}`;
                }
                return `${indent}${s}`;
            }
            if (s.startsWith("```")) {
                codeBlockIndent = 0;
                return '';
            }
            return i > 0 ? `\n${s}` : s;
        })
        .join("\n");

    const pageNameOrs = pageNames.join("|");
    const hashOrs = pageNames.filter((p) => !p.includes(" "));
    return filteredContent
        .replace(
            new RegExp(`#?\\[\\[(${pageNameOrs})\\]\\]`, "g"),
            (_, name) => `[${name}](/${convertPageToHtml({name, index})})`
        )
        .replace(
            new RegExp(`#(${hashOrs})`, "g"),
            (_, name) => `[${name}](/${convertPageToHtml({name, index})})`
        );
};

export const renderHtmlFromPage = ({
                                       outputPath,
                                       pageContent,
                                       p,
                                       config,
                                       pageNames,
                                   }: {
    outputPath: string;
    pageContent: string;
    p: string;
    config: Config;
    pageNames: string[];
}): void => {
    const preMarked = prepareContent({
        content: pageContent,
        pageNames,
        index: config.index,
    });
    const content = marked(preMarked);
    const name = convertPageToName(p);
    const hydratedHtml = hydrateHTML({
        name,
        content,
        template: config.template,
    });
    const htmlFileName = convertPageToHtml({
        name,
        index: config.index,
    });
    fs.writeFileSync(path.join(outputPath, htmlFileName), hydratedHtml);
};

const hydrateHTML = ({
                         name,
                         content,
                         template,
                     }: {
    name: string;
    content: string;
    template: string;
}) =>
    template
        .replace(/\${PAGE_NAME}/g, name)
        .replace(/\${PAGE_CONTENT}/g, content);

export const run = async (): Promise<void> => {
    const roamUsername = getInput("roam_username");
    const roamPassword = getInput("roam_password");
    const roamGraph = getInput("roam_graph");

    info(`Hello ${roamUsername}! Fetching from ${roamGraph}...`);

    return puppeteer
        .launch(
            process.env.NODE_ENV === "test"
                ? {}
                : {
                    executablePath: "/usr/bin/google-chrome-stable",
                }
        )
        .then(async (browser) => {
            const page = await browser.newPage();
            try {
                const downloadPath = path.join(process.cwd(), "downloads");
                const outputPath = path.join(process.cwd(), "out");
                fs.mkdirSync(downloadPath, {recursive: true});
                fs.mkdirSync(outputPath, {recursive: true});
                const cdp = await page.target().createCDPSession();
                cdp.send("Page.setDownloadBehavior", {
                    behavior: "allow",
                    downloadPath,
                });

                await page.goto("https://roamresearch.com/#/signin", {
                    waitUntil: "networkidle0",
                });
                await page.type("input[name=email]", roamUsername);
                await page.type("input[name=password]", roamPassword);
                await page.click("button.bp3-button");
                info(`Signing in ${new Date().toLocaleTimeString()}`);
                await page.waitForSelector(`a[href="#/app/${roamGraph}"]`, {
                    timeout: 120000,
                });
                await page.click(`a[href="#/app/${roamGraph}"]`);
                info(`entering graph ${new Date().toLocaleTimeString()}`);
                await page.waitForSelector("span.bp3-icon-more", {
                    timeout: 120000,
                });
                await page.click(`span.bp3-icon-more`);
                await page.waitForXPath("//div[text()='Export All']", {
                    timeout: 120000,
                });
                const [exporter] = await page.$x("//div[text()='Export All']");
                await exporter.click();
                await page.waitForSelector(".bp3-intent-primary");
                await page.click(".bp3-intent-primary");
                info(`exporting ${new Date().toLocaleTimeString()}`);
                const zipPath = await new Promise<string>((res) => {
                    const watcher = watch(
                        downloadPath,
                        {filter: /\.zip$/},
                        (eventType?: "update" | "remove", filename?: string) => {
                            if (eventType == "update" && filename) {
                                watcher.close();
                                res(filename);
                            }
                        }
                    );
                });
                info(`done waiting ${new Date().toLocaleTimeString()}`);
                await page.close();
                await browser.close();
                const data = await fs.readFileSync(zipPath);
                const zip = await jszip.loadAsync(data);

                const configPage = zip.files[`${CONFIG_PAGE_NAME}.md`];
                const config = {
                    ...defaultConfig,
                    ...(await (configPage
                        ? getConfigFromPage(configPage)
                        : Promise.resolve({}))),
                } as Config;

                const pages: { [key: string]: string } = {};
                await Promise.all(
                    Object.keys(zip.files)
                        .filter(config.titleFilter)
                        .map(async (k) => {
                            const content = await zip.files[k].async("text");
                            const filteredContent = config.contentFilter(content)
                            if (filteredContent) {
                                pages[k] = filteredContent;
                            }
                        })
                );
                const pageNames = Object.keys(pages).map(convertPageToName);
                info(`resolving ${pageNames.length} pages`);
                info(`Here are some: ${pageNames.slice(0, 5)}`);
                Object.keys(pages).map((p) => {
                    if (process.env.NODE_ENV === "test") {
                        try {
                            fs.writeFileSync(path.join(outputPath, encodeURIComponent(p)), pages[p]);
                        } catch {
                            console.warn("failed to output md for", p);
                        }
                    }
                    renderHtmlFromPage({
                        outputPath,
                        config,
                        pageContent: pages[p],
                        p,
                        pageNames,
                    });
                });
                return;
            } catch (e) {
                await page.screenshot({path: "error.png"});
                error("took screenshot");
                throw new Error(e);
            }
        })
        .catch((e) => {
            error(e.message);
            throw new Error(e);
        });
};

export default run;
