const fs = require("node:fs");
const path = require("node:path");
if (!process.env.DATABASE_TEST_URL) {
  console.error(
    "DATABASE_TEST_URL is required; tests use a disposable schema in that database.",
  );
  process.exit(1);
}
const cache = path.resolve(__dirname, "../.jest-cache");
fs.mkdirSync(cache, { recursive: true });
process.env.TEMP = cache;
process.env.TMP = cache;
process.env.TMPDIR = cache;
require("jest/bin/jest");
