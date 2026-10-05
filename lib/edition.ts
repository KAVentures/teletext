import { unstable_cache } from "next/cache";
import { mockEdition } from "./mock-edition";
import {
  buildGlobalEditionWithGrok,
  buildTopicEditionFromPosts,
  buildTopicEditionWithGrokSearch,
  buildTopicEditionWithXWebSearch
} from "./editor";
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

function errorEdition(query: string, language: string, message: string): TeletextEdition {
  return {
    updatedAt: new Date().toISOString(),
    mode: "error",
    basis: message,
    trends: query ? [query] : [],
    stories: [],
    language,
    ...(query ? { query } : {})
  };
}

async function buildGlobal(language: string): Promise<TeletextEdition> {
  if (!process.env.XAI_API_KEY) {
    if (process.env.NODE_ENV !== "production") {
      return { ...mockEdition, language, updatedAt: new Date().toISOString() };
    }
    throw new Error("XAI_API_KEY is not configured");
  }

  return buildGlobalEditionWithGrok(language);
}

async function fetchTopicEvidence(queryKey: string) {
  if (!process.env.X_BEARER_TOKEN) {
    throw new Error("X_BEARER_TOKEN is required for direct topic search");
  }
  return searchXTopic(queryKey);
}

const cachedTopicEvidence = unstable_cache(
  fetchTopicEvidence,
  ["teletext-topic-evidence-v2"],
  { revalidate: 1800, tags: ["teletext-topic-evidence"] }
);

async function buildTopic(queryKey: string, language: string): Promise<TeletextEdition> {
  if (!process.env.XAI_API_KEY) {
    if (process.env.NODE_ENV !== "production") {
      return {
        ...mockEdition,
        updatedAt: new Date().toISOString(),
        language,
        query: queryKey,
        stories: mockEdition.stories.map((story, index) => ({ ...story, page: 901 + index }))
      };
    }
    throw new Error("XAI_API_KEY is not configured");
  }

  if ((process.env.X_DIRECT_TOPIC_SEARCH || "false").toLowerCase() === "true") {
    try {
      const posts = await cachedTopicEvidence(queryKey);
      return await buildTopicEditionFromPosts({
        query: queryKey,
        language,
        posts
      });
    } catch (directError) {
      console.warn("Direct X topic search unavailable; using xAI search path", directError);
    }
  }

  try {
    return await buildTopicEditionWithXWebSearch({
      query: queryKey,
      language
    });
  } catch (webFallbackError) {
    console.warn("X-restricted web search unavailable; falling back to native xAI X Search", webFallbackError);

    return buildTopicEditionWithGrokSearch({
      query: queryKey,
      language
    });
  }
}

const cachedGlobalEdition = unstable_cache(
  buildGlobal,
  ["teletext-global-edition-v6"],
  { revalidate: 600, tags: ["teletext-global-edition"] }
);

const cachedTopicEdition = unstable_cache(
  buildTopic,
  ["teletext-topic-edition-v6"],
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

  try {
    if (!displayQuery) {
      return await cachedGlobalEdition(lang);
    }

    return await cachedTopicEdition(canonicalQuery(displayQuery), lang);
  } catch (error) {
    console.error("Edition generation failed without caching fallback", error);
    return errorEdition(
      displayQuery,
      lang,
      displayQuery
        ? `Could not refresh "${displayQuery}" right now. Please retry in a moment.`
        : "Could not refresh the live edition right now. Please retry in a moment."
    );
  }
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
