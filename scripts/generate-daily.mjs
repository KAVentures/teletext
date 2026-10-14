// The GitHub Actions publisher holds no xAI secret.
// A short-lived, signed GitHub OIDC token authorizes its one daily API call
// through the production Vercel endpoint, where XAI_API_KEY already lives.
import { readFile, writeFile, rename } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LANGUAGES, utcDate, alreadyPublished, isCompleteEdition } from "./daily-utils.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "data", "daily-edition.json");
const today = utcDate();
const previous = JSON.parse(await readFile(target, "utf8"));

if (alreadyPublished(previous, today)) {
  console.info("A complete daily edition already exists; no API calls.");
  process.exit(0);
}

const oidcEndpoint = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
const oidcBearer = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
if (!oidcEndpoint || !oidcBearer) {
  throw new Error("GitHub OIDC unavailable: workflow must grant id-token: write.");
}
const audience = "https://x.kinvectum.com/api/internal/daily-edition";
const url = new URL(oidcEndpoint);
url.searchParams.set("audience", audience);
const tokenResponse = await fetch(url, {
  headers: { Authorization: `Bearer ${oidcBearer}` },
  signal: AbortSignal.timeout(10000),
  cache: "no-store"
});
if (!tokenResponse.ok) throw new Error("Could not obtain the signed GitHub Actions OIDC token");
const data = await tokenResponse.json();
if (typeof data.value !== "string") throw new Error("Missing GitHub OIDC token");

const publishResponse = await fetch(audience, {
  method: "POST",
  headers: { Authorization: `Bearer ${data.value}` },
  cache: "no-store",
  signal: AbortSignal.timeout(240000)
});
if (!publishResponse.ok) {
  throw new Error("Vercel daily publication failed (HTTP " + publishResponse.status + ")");
}
const result = await publishResponse.json();
if (result.date !== today || !result.editions ||
    !LANGUAGES.every((lang) => isCompleteEdition(result.editions[lang], lang))) {
  throw new Error("Daily publisher returned incomplete data or the wrong UTC date");
}

const next = { date: today, editions: result.editions };
const tmp = target + ".tmp";
await writeFile(tmp, JSON.stringify(next, null, 2) + "\n", "utf8");
await rename(tmp, target);
console.info("Prepared complete, validated five-language daily snapshot for " + today);
