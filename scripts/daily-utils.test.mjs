import test from "node:test";
import assert from "node:assert/strict";
import { LANGUAGES, utcDate, isCompleteEdition, alreadyPublished } from "./daily-utils.mjs";

const today = "2026-10-14";
const edition = (lang) => ({
  mode: "live",
  updatedAt: today + "T06:15:00.000Z",
  language: lang,
  stories: Array.from({ length: 4 }, (_, index) => ({
    headline: "Story " + index,
    paragraphs: ["Text"]
  }))
});

test("empty and incomplete snapshots never suppress generation", () => {
  assert.equal(alreadyPublished({}, today), false);
  assert.equal(alreadyPublished({ date: today, editions: { en: edition("en") } }, today), false);
});

test("complete snapshot prevents all same-day regeneration", () => {
  const snapshot = {
    date: today,
    editions: Object.fromEntries(LANGUAGES.map((lang) => [lang, edition(lang)]))
  };
  assert.equal(alreadyPublished(snapshot, today), true);
  assert.equal(alreadyPublished(snapshot, "2026-10-15"), false);
});

test("invalid or empty editions are never published", () => {
  assert.equal(isCompleteEdition(edition("sv"), "en"), false);
  assert.equal(isCompleteEdition({ ...edition("en"), stories: [] }, "en"), false);
});

test("date keys use UTC", () => {
  assert.equal(utcDate(new Date("2026-10-14T23:59:59Z")), today);
  assert.equal(utcDate(new Date("2026-10-15T00:00:01Z")), "2026-10-15");
});
