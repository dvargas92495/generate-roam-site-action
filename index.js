const core = require('@actions/core');
const github = require('@actions/github');

try {
  const roamUsername = core.getInput('roam-username');
  const roamPassword = core.getInput('roam-password');
  const roamGraph = core.getInput('roam-graph');
  console.log(`Hello ${roamUsername}:${roamPassword} - ${roamGraph}!`);
  const payload = JSON.stringify(github.context.payload)
  console.log(`The event payload: ${payload}`);
} catch (error) {
  core.setFailed(error.message);
}