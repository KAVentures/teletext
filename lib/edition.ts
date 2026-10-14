import dailySnapshot from "../data/daily-edition.json";
import type { TeletextEdition } from "./types";

export const supportedLanguages = ["en", "sv", "de", "es", "fr"] as const;

export function normalizeLanguage(value?: string): (typeof supportedLanguages)[number] {
  const lang = (value || "en").toLowerCase() as (typeof supportedLanguages)[number];
  return supportedLanguages.includes(lang) ? lang : "en";
}

type DailySnapshot = {
  date: string;
  editions: Partial<Record<(typeof supportedLanguages)[number], TeletextEdition>>;
};

const published = dailySnapshot as DailySnapshot;

// Browser requests are READ-ONLY. No visitor-facing code imports the paid
// editor. xAI can run only through the authenticated daily publishing job.
export async function getGlobalEdition(language?: string): Promise<TeletextEdition> {
  const lang = normalizeLanguage(language);
  const edition = published.editions[lang] || published.editions.en;
  if (edition?.mode === "live" && edition.stories.length >= 4) {
    return edition;
  }
  return {
    updatedAt: "1970-01-01T00:00:00.000Z",
    mode: "error",
    basis: "The daily bulletin has not been published yet. Please check back after the scheduled update.",
    trends: [],
    stories: [],
    language: lang
  };
}
