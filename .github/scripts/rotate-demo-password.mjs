// Derives the same daily password as worker/index.ts's deriveDailyPassword
// and republishes it into README.md. Keep the two derivations in sync.
import { createHmac } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const seed = process.env.BASIC_AUTH_SEED;
if (!seed) {
  console.error("BASIC_AUTH_SEED is not set — add it as a repo secret first.");
  process.exit(1);
}

function utcDateString(offsetDays) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function deriveDailyPassword(seed, offsetDays) {
  const hex = createHmac("sha256", seed).update(utcDateString(offsetDays)).digest("hex");
  return `Demo-${hex.slice(0, 16)}`;
}

const password = deriveDailyPassword(seed, 0);

const readmePath = new URL("../../README.md", import.meta.url);
const readme = readFileSync(readmePath, "utf8");

const pattern = /(login `cftemplate` \/ `)[^`]+(`)/;
if (!pattern.test(readme)) {
  console.error("Could not find the demo credentials line in README.md — pattern out of date?");
  process.exit(1);
}

writeFileSync(readmePath, readme.replace(pattern, `$1${password}$2`));
console.log(`Published today's (${utcDateString(0)}) demo password to README.md`);
