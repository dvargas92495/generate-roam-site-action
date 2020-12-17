import run from "./generate-site";
import { setFailed, info } from "@actions/core";

run()
  .then(() => info("Done!"))
  .catch((e) => setFailed(e.message));
