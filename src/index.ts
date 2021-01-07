import run from "generate-roam-site";
import { setFailed, info, getInput, error } from "@actions/core";

const runAll = (): Promise<void> =>
  run({
    roamUsername: getInput("roam_username"),
    roamPassword: getInput("roam_password"),
    roamGraph: getInput("roam_graph"),
    logger: { info, error },
  })
    .then(() => info("Done!"))
    .catch((e) => setFailed(e.message));

if (process.env.NODE_ENV !== "test") {
  runAll();
}

export default runAll;
