import { getInput } from "@actions/core";
import { context } from "@actions/github";
import puppeteer from "puppeteer";
import path from 'path';

const run = async (): Promise<{ message: string } | void> =>
  new Promise((resolve, reject) => {
    try {
      const roamUsername = getInput("roam_username");
      const roamPassword = getInput("roam_password");
      const roamGraph = getInput("roam_graph");
      console.log(`Hello ${roamUsername}! Fetching from ${roamGraph}...`);
      const payload = JSON.stringify(context.payload);
      console.log(`The event payload: ${payload}`);

      return puppeteer.launch().then(async (browser) => {
        const page = await browser.newPage();
        page.on("load", e => console.log("load", e));
        page.on("response", e => console.log("response", e.url()));
        try {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore https://github.com/puppeteer/puppeteer/issues/299#issuecomment-728162953
          await page._client.send("Page.setDownloadBehavior", {
            behavior: "allow",
            downloadPath: path.join(process.cwd(), "downloads"),
          });
          await page.goto("https://roamresearch.com/#/signin", {
            waitUntil: "networkidle0",
          });
          await page.type("input[name=email]", roamUsername);
          await page.type("input[name=password]", roamPassword);
          await page.click("button.bp3-button");
          console.log("Signing in");
          await page.waitForNavigation({ waitUntil: "networkidle0" });
          await page.waitForSelector("a", { timeout: 10000 });
          await page.click(`a[href="#/app/${roamGraph}"]`);
          console.log("entering graph");
          await page.waitForSelector("span.bp3-icon-more", { timeout: 120000 });
          await page.click(`span.bp3-icon-more`);
          await page.click(".bp3-menu li:nth-child(5)");
          await page.waitForSelector(".bp3-intent-primary");
          await page.click(".bp3-intent-primary");
          console.log("exporting");
          await page.waitForTimeout(45000);
          console.log("done waiting");
          return resolve();
        } catch (e) {
          await page.screenshot({ path: "error.png" });
          console.log("took screenshot");
          return reject(e);
        }
      });
    } catch (error) {
      console.log("catching error...");
      return reject(error);
    }
  });

export default run;
