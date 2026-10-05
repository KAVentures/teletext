import { unstable_cache } from "next/cache";
import { mockEdition } from "./mock-edition";
import { buildGlobalEditionWithGrok, buildTopicEditionFromPosts } from "./editor";
import { searchXTopic } from "./x";
import type { TeletextEdition } from "./types";

export const supportedLanguages = ["en", "sv", "de", "es", "fr"] as const;

export function normalizeLanguage(value?: string) {
  const lang = (value || "en").toLowerCase();
  return supportedLanguages.includes(lang as (typeof supportedLanguages)[number]) ? lang : "en";
}

export function normalizeQuery(value?: string) {
  return (value || "").trim().replace(/\s+/g, " ").slice(0, 120);
}

function canonicalQuery(value?: string) {
  return normalizeQuery(value).toLocaleLowerCase("en-US");
}

function fallbackEdition(query: string, language: string): TeletextEdition {
  const firstPage = query ? 901 : 101;
  return {
    ...mockEdition,
    updatedAt: new Date().toISOString(),
    basis: query
      ? `Live topic search failed for "${query}"; showing a safe demo edition instead.`
      : "Live update failed; showing a safe demo edition. Check server logs and API access.",
    stories: mockEdition.stories.map((story, index) => ({ ...story, page: firstPage + index })),
    language,
    ...(query ? { query } : {})
  };
}

async function buildGlobal(language: string): Promise<TeletextEdition> {
  if (!process.env.XAI_API_KEY) return fallbackEdition("", language);

  try {
    return await buildGlobalEditionWithGrok(language);
  } catch (error) {
    console.error("Global edition generation failed", error);
    return fallbackEdition("", language);
  }
}

async function fetchTopicEvidence(queryKey: string) {
  if (!process.env.X_BEARER_TOKEN) {
    throw new Error("X_BEARER_TOKEN is required for low-cost topic search");
  }
  return searchXTopic(queryKey);
}

const cachedTopicEvidence = unstable_cache(
  fetchTopicEvidence,
  ["teletext-topic-evidence-v1"],
  { revalidate: 1800, tags: ["teletext-topic-evidence"] }
);

async function buildTopic(queryKey: string, language: string): Promise<TeletextEdition> {
  if (!process.env.XAI_API_KEY) return fallbackEdition(queryKey, language);

  try {
    const posts = await cachedTopicEvidence(queryKey);
    return await buildTopicEditionFromPosts({
      query: queryKey,
      language,
      posts
    });
  } catch (error) {
    console.error("Topic edition generation failed", error);
    return fallbackEdition(queryKey, language);
  }
}

const cachedGlobalEdition = unstable_cache(
  buildGlobal,
  ["teletext-global-edition-v5"],
  { revalidate: 600, tags: ["teletext-global-edition"] }
);

const cachedTopicEdition = unstable_cache(
  buildTopic,
  ["teletext-topic-edition-v5"],
  { revalidate: 1800, tags: ["teletext-topic-edition"] }
);

export async function getEdition({
  query,
  language
}: {
  query?: string;
  language?: string;
}) {
  const lang = normalizeLanguage(language);
  const displayQuery = normalizeQuery(query);

  if (!displayQuery) {
    return cachedGlobalEdition(lang);
  }

  // Cache searches case-insensitively so OpenAI/openai/OPENAI share the same
  // X fetch and Grok summary. This is a major cost control for popular topics.
  return cachedTopicEdition(canonicalQuery(displayQuery), lang);
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
