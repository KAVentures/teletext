// Runs only in the daily GitHub Actions job, never in an HTTP request.
// Node 24 supports stripping types from lib/editor.ts without a build step.
import { readFile, writeFile, rename } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildGlobalBaseEdition, translateEdition } from "../lib/editor.ts";
import { LANGUAGES, utcDate, alreadyPublished, isCompleteEdition } from "./daily-utils.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "data", "daily-edition.json");
const today = utcDate();

let previous = {};
try {
  previous = JSON.parse(await readFile(target, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

if (alreadyPublished(previous, today)) {
  console.info("Daily edition already published for " + today + " UTC; skipping paid API requests.");
  process.exit(0);
}

if (!process.env.XAI_API_KEY) {
  throw new Error("Missing XAI_API_KEY GitHub Actions repository secret; no API requests made.");
}

const english = await buildGlobalBaseEdition();
if (!isCompleteEdition(english, "en")) {
  throw new Error("English daily edition failed validation; leaving previous edition intact.");
}

// Generate every supported translation once, in the scheduled job rather than
// when each new language is first viewed by a visitor.
const editions = { en: english };
for (const language of LANGUAGES.filter((lang) => lang !== "en")) {
  const translated = await translateEdition(english, language);
  if (!isCompleteEdition(translated, language)) {
    throw new Error("Daily " + language + " translation failed validation; previous snapshot unchanged.");
  }
  editions[language] = translated;
}

const snapshot = { date: today, editions };
const temporary = target + ".tmp";
await writeFile(temporary, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
await rename(temporary, target);
console.info("Published a complete global Teletext snapshot for " + today + " UTC.");
