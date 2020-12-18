import { error, getInput, info } from "@actions/core";
import { context } from "@actions/github";
import puppeteer from "puppeteer";
import path from "path";
import watch from "node-watch";
import fs from "fs";
import jszip from "jszip";
import marked from "marked";

type Config = { index?: string; filter?: (title: string) => boolean };

const defaultConfig = {
  index: "Website Index",
  filter: () => true,
};

type Node = {
  text: string;
  children: Node[];
};

const getRuleFromNode = (n: Node) => {
  const { text, children } = n;
  if (text.trim().toUpperCase() === "STARTS WITH" && children.length) {
    return (s: string) => s.startsWith(children[0].text);
  } else {
    return () => true;
  }
};

const getConfigFromPage = async (page: jszip.JSZipObject) => {
  const content = await page.async("text");
  const contentParts = content.split("\n");
  const parsedTree: Node[] = [];
  let currentNode = { children: parsedTree };
  let currentIndent = 0;
  for (const text of contentParts) {
    const node = { text: text.substring(text.indexOf("- ") + 2), children: [] };
    const indent = text.indexOf("- ") / 4;
    if (indent === currentIndent) {
      currentNode.children.push(node);
    } else if (indent > currentIndent) {
      currentNode = currentNode.children[currentNode.children.length - 1];
      currentNode.children.push(node);
      currentIndent = indent;
    } else {
      currentNode = { children: parsedTree };
      for (let i = 1; i < indent; i++) {
        currentNode = currentNode.children[currentNode.children.length - 1];
      }
      currentIndent = indent;
      currentNode.children.push(node);
    }
  }

  const indexNode = parsedTree.find(
    (n) => n.text.trim().toUpperCase() === "INDEX"
  );
  const filterNode = parsedTree.find(
    (n) => n.text.trim().toUpperCase() === "FILTER"
  );
  const withIndex: Config =
    indexNode && indexNode.children.length
      ? { index: indexNode.children[0].text.trim() }
      : {};
  const withFilter: Config =
    filterNode && filterNode.children.length
      ? {
          filter: (s: string) =>
            filterNode.children.map(getRuleFromNode).some((r) => r(s)),
        }
      : {};
  return {
    ...withIndex,
    ...withFilter,
  };
};

const hydrateHTML = ({
  name,
  content,
}: {
  name: string;
  content: string;
}) => `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>${name}</title>
</head>
<body>
<div id="content">
${content}
</div>
</body>
</html>`;

export const run = async (): Promise<void> =>
  await new Promise((resolve, reject) => {
    try {
      const roamUsername = getInput("roam_username");
      const roamPassword = getInput("roam_password");
      const roamGraph = getInput("roam_graph");
      info(`Hello ${roamUsername}! Fetching from ${roamGraph}...`);
      const payload = JSON.stringify(context.payload);
      info(`The event payload: ${payload}`);

      return puppeteer
        .launch({
          executablePath: "/usr/bin/google-chrome-stable",
        })
        .then(async (browser) => {
          const page = await browser.newPage();
          try {
            const downloadPath = path.join(process.cwd(), "downloads");
            const outputPath = path.join(process.cwd(), "out");
            fs.mkdirSync(downloadPath, { recursive: true });
            fs.mkdirSync(outputPath, { recursive: true });
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
            info("Signing in");
            await page.waitForSelector(`a[href="#/app/${roamGraph}"]`, {
              timeout: 20000,
            });
            await page.click(`a[href="#/app/${roamGraph}"]`);
            info("entering graph");
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
                { filter: /\.zip$/ },
                (eventType?: "update" | "remove", filename?: string) => {
                  if (eventType == "update" && filename) {
                    watcher.close();
                    res(filename);
                  }
                }
              );
            });
            info(`done waiting ${new Date().toLocaleTimeString()}`);
            await browser.close();
            const data = await fs.readFileSync(zipPath);
            const zip = await jszip.loadAsync(data);

            const configPage = zip.files["roam/js/public-garden.md"];
            const config = {
              ...defaultConfig,
              ...(await (configPage
                ? getConfigFromPage(configPage)
                : Promise.resolve({}))),
            };

            const pages: { [key: string]: string } = {};
            await Promise.all(
              Object.keys(zip.files)
                .filter(config.filter)
                .map(async (k) => {
                  const content = await zip.files[k].async("text");
                  pages[k] = content;
                })
            );
            info(`resolving ${Object.keys(pages).length} pages`);
            info(`Here are some: ${Object.keys(pages).slice(0, 5)}`);
            Object.keys(pages).map((p) => {
              const content = marked(pages[p]);
              const name = p.substring(0, p.length - ".md".length);
              const hydratedHtml = hydrateHTML({ name, content });
              const htmlFileName =
                name === config.index ? "index.html" : `${name}.html`;
              const newFileName = encodeURIComponent(
                htmlFileName.replace(/ /g, "_")
              );
              fs.writeFileSync(
                path.join(outputPath, newFileName),
                hydratedHtml
              );
            });
            return resolve();
          } catch (e) {
            await page.screenshot({ path: "error.png" });
            error("took screenshot");
            error(e.message);
            return reject(e);
          }
        })
        .catch((e) => {
          error(e.message);
          return reject(e);
        });
    } catch (error) {
      info("catching error...");
      return reject(error);
    }
  });

export default run;
