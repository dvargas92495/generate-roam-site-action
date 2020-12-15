import { getInput, setFailed } from "@actions/core";
import { context } from "@actions/github";
import chalk from "chalk";

const run = () => {
  try {
    const roamUsername = getInput("roam-username");
    const roamPassword = getInput("roam-password");
    const roamGraph = getInput("roam-graph");
    chalk.green(`Hello ${roamUsername}:${roamPassword} - ${roamGraph}!`);
    const payload = JSON.stringify(context.payload);
    chalk.green(`The event payload: ${payload}`);
  } catch (error) {
    setFailed(error.message);
  }
};

run();

export default run;
