import run from "../src/generate-site";
import dotenv from "dotenv";
dotenv.config();

test("Run Action", async (done) => {
  jest.setTimeout(600000); // 10 min
  await run()
    .then(done)
    .catch(({ message }) => fail(message));
});
