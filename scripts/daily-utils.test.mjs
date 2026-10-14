import test from "node:test";
import assert from "node:assert/strict";
import { LANGUAGES, utcDate, isCompleteEdition, alreadyPublished } from "./daily-utils.mjs";

const today = "2026-10-14";
const edition = (lang) => ({
  mode: "live", updatedAt: today + "T06:15:00.000Z", language: lang,
  stories: Array.from({ length: 4 }, (_, index) => ({
    headline: "Story " + index, paragraphs: ["Text"],
    sources: [{ label: "X", url: "https://x.com/test/status/1234567890" }]
  }))
});

test("empty and incomplete snapshots never suppress generation", () => {
  assert.equal(alreadyPublished({}, today), false);
  assert.equal(alreadyPublished({ date: today, editions: { en: edition("en") } }, today), false);
});

test("complete five-language snapshot prevents same-day calls", () => {
  const snap = { date: today, editions: Object.fromEntries(LANGUAGES.map((lang) => [lang, edition(lang)])) };
  assert.equal(alreadyPublished(snap, today), true);
  assert.equal(alreadyPublished(snap, "2026-10-15"), false);
});

test("invalid translations and unsourced stories fail closed", () => {
  assert.equal(isCompleteEdition(edition("sv"), "en"), false);
  assert.equal(isCompleteEdition({ ...edition("en"), stories: [] }, "en"), false);
  const noSources = { ...edition("en"), stories: edition("en").stories.map((s) => ({ ...s, sources: [] })) };
  assert.equal(isCompleteEdition(noSources, "en"), false);
});

test("date is UTC, not client locale", () => {
  assert.equal(utcDate(new Date("2026-10-14T23:59:59Z")), today);
  assert.equal(utcDate(new Date("2026-10-15T00:00:01Z")), "2026-10-15");
});

test("browser API/profile URLs no longer import or invoke editor", async () => {
  const { readFile } = await import("node:fs/promises");
  const paths = ["app/[page]/page.tsx", "app/api/edition/route.ts", "components/TeletextApp.tsx", "lib/edition.ts"];
  for (const path of paths) {
    const source = await readFile(path, "utf8");
    assert.doesNotMatch(source, /getMyXEdition|fetchProfileEdition|from ["'].*editor["']/);
  }
  const api = await readFile("app/api/edition/route.ts", "utf8");
  assert.match(api, /searchParams\.has\("u"\)/);
  assert.match(api, /status: 410/);
});
