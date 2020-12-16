import run from "./generate-site";
import { setFailed } from "@actions/core";

run().catch((e) => setFailed(e.message));
