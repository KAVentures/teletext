// Reserve today's single run *before* sending any billable request.
// GitHub Actions commits this marker, even if the API later fails, so
// another manual/scheduled run cannot accidentally spend again today.
import { readFile, writeFile } from "node:fs/promises";
import { utcDate, alreadyPublished } from "./daily-utils.mjs";

const today = utcDate();
const edition = JSON.parse(await readFile("data/daily-edition.json", "utf8"));
const last = JSON.parse(await readFile("data/daily-attempt.json", "utf8"));
const shouldRun = !alreadyPublished(edition, today) && last.date !== today;
if (shouldRun) {
  await writeFile("data/daily-attempt.json",
    JSON.stringify({ date: today, at: new Date().toISOString() }, null, 2) + "\n");
}
if (process.env.GITHUB_OUTPUT) {
  const { appendFile } = await import("node:fs/promises");
  await appendFile(process.env.GITHUB_OUTPUT, "run=" + String(shouldRun) + "\n");
}
console.info(shouldRun ? "Reserved the UTC-day publisher attempt" :
  "Daily edition already published/attempted; no paid requests will be made");
