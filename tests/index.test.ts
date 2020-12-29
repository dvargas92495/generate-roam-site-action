import run, { defaultConfig, renderHtmlFromPage } from "../src/generate-site";
import dotenv from "dotenv";
import path from 'path';
import fs from 'fs';
dotenv.config();

test("Run Action", async (done) => {
  jest.setTimeout(600000); // 10 min
  await run()
    .then(done)
    .catch(({ message }) => fail(message));
});

test.skip('render', async () => {
  const pageContent = fs.readFileSync(path.join(__dirname, '..','out', 'Blog Post.md')).toString();
  await renderHtmlFromPage({
    outputPath: path.join(__dirname, '..','out'),
    pageContent,
    p: 'Blog Post.md',
    pageNames: [],
    config: defaultConfig,
  })
})
