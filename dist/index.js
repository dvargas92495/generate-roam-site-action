"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@actions/core");
const github_1 = require("@actions/github");
const chalk_1 = __importDefault(require("chalk"));
const run = () => {
    try {
        const roamUsername = core_1.getInput("roam-username");
        const roamPassword = core_1.getInput("roam-password");
        const roamGraph = core_1.getInput("roam-graph");
        chalk_1.default.green(`Hello ${roamUsername}:${roamPassword} - ${roamGraph}!`);
        const payload = JSON.stringify(github_1.context.payload);
        chalk_1.default.green(`The event payload: ${payload}`);
    }
    catch (error) {
        core_1.setFailed(error.message);
    }
};
run();
exports.default = run;
