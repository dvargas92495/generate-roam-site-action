import dotenv from "dotenv";
import run from '../src';
dotenv.config();

test("Run Action", async (done) => {
  jest.setTimeout(600000); // 10 min
  await run().then(() => done());
});
