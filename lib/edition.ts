import { unstable_cache } from "next/cache";
import { mockEdition } from "./mock-edition";
import { buildTrendingEditionWithGrok } from "./editor";
import type { TeletextEdition } from "./types";

export const supportedLanguages = ["en", "sv", "de", "es", "fr"] as const;

export function normalizeLanguage(value?: string) {
  const lang = (value || "en").toLowerCase();
  return supportedLanguages.includes(lang as (typeof supportedLanguages)[number]) ? lang : "en";
}

export function normalizeQuery(value?: string) {
  return (value || "").trim().replace(/\s+/g, " ").slice(0, 120);
}

function fallbackEdition(query: string, language: string): TeletextEdition {
  const firstPage = query ? 901 : 101;
  return {
    ...mockEdition,
    updatedAt: new Date().toISOString(),
    basis: query
      ? `Live topic search failed for "${query}"; showing a safe demo edition instead.`
      : "Live update failed; showing the safe demo edition. Check server logs and xAI API access.",
    stories: mockEdition.stories.map((story, index) => ({ ...story, page: firstPage + index })),
    language,
    ...(query ? { query } : {})
  };
}

async function buildEdition(query: string, language: string): Promise<TeletextEdition> {
  if (!process.env.XAI_API_KEY) {
    return fallbackEdition(query, language);
  }

  try {
    return await buildTrendingEditionWithGrok({
      query: query || undefined,
      language
    });
  } catch (error) {
    console.error("Live edition generation failed", error);
    return fallbackEdition(query, language);
  }
}

const cachedEdition = unstable_cache(
  buildEdition,
  ["teletext-live-edition-v4"],
  { revalidate: 600, tags: ["teletext-edition"] }
);

export async function getEdition({
  query,
  language
}: {
  query?: string;
  language?: string;
}) {
  return cachedEdition(normalizeQuery(query), normalizeLanguage(language));
}

export function makeSearchShellEdition(language?: string): TeletextEdition {
  const lang = normalizeLanguage(language);
  return {
    updatedAt: new Date().toISOString(),
    mode: "live",
    basis: "Search X for any topic and turn the latest conversation into a Teletext briefing.",
    trends: [],
    stories: [],
    language: lang
  };
}
