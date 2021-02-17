import run from "generate-roam-site";
import { setFailed, info, getInput, error } from "@actions/core";
import path from "path";
import fs from "fs";

const runAll = (): Promise<void> => {
  const configPath = path.join(__dirname, getInput("config_path"));

  return run({
    roamUsername: getInput("roam_username"),
    roamPassword: getInput("roam_password"),
    roamGraph: getInput("roam_graph"),
    logger: { info, error },
    inputConfig: fs.existsSync(configPath)
      ? JSON.parse(fs.readFileSync(configPath).toString())
      : {},
  })
    .then(() => info("Done!"))
    .catch((e) => setFailed(e.message));
};

if (process.env.NODE_ENV !== "test") {
  runAll();
}

export default runAll;
