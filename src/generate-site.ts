import { getInput, info } from "@actions/core";
import { context } from "@actions/github";
import puppeteer from "puppeteer";
import path from "path";
import watch from "node-watch";
import fs from "fs";
import jszip from "jszip";

export const run = async (): Promise<{ message: string } | void> =>
  await new Promise((resolve, reject) => {
    try {
      const roamUsername = getInput("roam_username");
      const roamPassword = getInput("roam_password");
      const roamGraph = getInput("roam_graph");
      info(`Hello ${roamUsername}! Fetching from ${roamGraph}...`);
      const payload = JSON.stringify(context.payload);
      info(`The event payload: ${payload}`);

      return puppeteer.launch().then(async (browser) => {
        const page = await browser.newPage();
        try {
          const downloadPath = path.join(process.cwd(), "downloads");
          fs.mkdirSync(downloadPath, { recursive: true });
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
          await page.waitForNavigation({ waitUntil: "networkidle0" });
          await page.waitForSelector("a", { timeout: 10000 });
          await page.click(`a[href="#/app/${roamGraph}"]`);
          info("entering graph");
          await page.waitForSelector("span.bp3-icon-more", { timeout: 120000 });
          await page.click(`span.bp3-icon-more`);
          await page.click(".bp3-menu li:nth-child(5)");
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
          const pages: { [key: string]: string } = {};
          await Promise.all(
            Object.keys(zip.files).map(async (k) => {
              const content = await zip.files[k].async("text");
              pages[k] = content;
            })
          );
          info(`resolving ${Object.keys(pages).length} pages`);
          return resolve();
        } catch (e) {
          await page.screenshot({ path: "error.png" });
          info("took screenshot");
          return reject(e);
        }
      });
    } catch (error) {
      info("catching error...");
      return reject(error);
    }
  });

export default run;
