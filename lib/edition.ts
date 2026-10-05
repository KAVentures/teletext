import { unstable_cache } from "next/cache";
import { mockEdition } from "./mock-edition";
import {
  buildGlobalBaseEdition,
  buildTopicBaseWithGrokSearch,
  buildTopicBaseWithXWebSearch,
  buildTopicEditionFromPosts,
  translateEdition
} from "./editor";
import { assertGlobalGenerationBudget, assertTopicGenerationBudget } from "./budget";
import { searchXTopic } from "./x";
import type { TeletextEdition } from "./types";

export const supportedLanguages = ["en", "sv", "de", "es", "fr"] as const;

const GLOBAL_REVALIDATE_SECONDS = 4 * 60 * 60;
const TOPIC_REVALIDATE_SECONDS = 24 * 60 * 60;
const TRANSLATION_REVALIDATE_SECONDS = 24 * 60 * 60;

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

async function buildGlobalBase(): Promise<TeletextEdition> {
  if (!process.env.XAI_API_KEY) {
    if (process.env.NODE_ENV !== "production") {
      return { ...mockEdition, language: "en", updatedAt: new Date().toISOString() };
    }
    throw new Error("XAI_API_KEY is not configured");
  }

  await assertGlobalGenerationBudget();
  return buildGlobalBaseEdition();
}

async function fetchTopicEvidence(queryKey: string) {
  if (!process.env.X_BEARER_TOKEN) {
    throw new Error("X_BEARER_TOKEN is required for direct topic search");
  }
  return searchXTopic(queryKey);
}

const cachedTopicEvidence = unstable_cache(
  fetchTopicEvidence,
  ["teletext-topic-evidence-v3"],
  { revalidate: TOPIC_REVALIDATE_SECONDS, tags: ["teletext-topic-evidence"] }
);

async function buildTopicBase(queryKey: string): Promise<TeletextEdition> {
  if (!process.env.XAI_API_KEY) {
    if (process.env.NODE_ENV !== "production") {
      return {
        ...mockEdition,
        updatedAt: new Date().toISOString(),
        language: "en",
        query: queryKey,
        stories: mockEdition.stories.map((story, index) => ({ ...story, page: 901 + index }))
      };
    }
    throw new Error("XAI_API_KEY is not configured");
  }

  await assertTopicGenerationBudget();

  if ((process.env.X_DIRECT_TOPIC_SEARCH || "false").toLowerCase() === "true") {
    try {
      const posts = await cachedTopicEvidence(queryKey);
      return await buildTopicEditionFromPosts({
        query: queryKey,
        posts
      });
    } catch (directError) {
      console.warn("Direct X topic search unavailable; using xAI search path", directError);
    }
  }

  try {
    return await buildTopicBaseWithXWebSearch(queryKey);
  } catch (webFallbackError) {
    console.warn("X-restricted web search unavailable; falling back to native xAI X Search", webFallbackError);
    return buildTopicBaseWithGrokSearch(queryKey);
  }
}

async function translateSerializedEdition(
  serializedEdition: string,
  language: string
): Promise<TeletextEdition> {
  const edition = JSON.parse(serializedEdition) as TeletextEdition;
  return translateEdition(edition, language);
}

const cachedGlobalBase = unstable_cache(
  buildGlobalBase,
  ["teletext-global-base-v8"],
  { revalidate: GLOBAL_REVALIDATE_SECONDS, tags: ["teletext-global-base"] }
);

const cachedTopicBase = unstable_cache(
  buildTopicBase,
  ["teletext-topic-base-v8"],
  { revalidate: TOPIC_REVALIDATE_SECONDS, tags: ["teletext-topic-base"] }
);

const cachedTranslation = unstable_cache(
  translateSerializedEdition,
  ["teletext-edition-translation-v2"],
  { revalidate: TRANSLATION_REVALIDATE_SECONDS, tags: ["teletext-translation"] }
);

async function localizeEdition(
  edition: TeletextEdition,
  language: string
): Promise<TeletextEdition> {
  if (language === "en" || edition.stories.length === 0) {
    return { ...edition, language };
  }

  return cachedTranslation(JSON.stringify(edition), language);
}

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
      const base = await cachedGlobalBase();
      return await localizeEdition(base, lang);
    }

    const queryKey = canonicalQuery(displayQuery);
    const base = await cachedTopicBase(queryKey);
    const localized = await localizeEdition(base, lang);

    return {
      ...localized,
      query: displayQuery,
      trends: [displayQuery]
    };
  } catch (error) {
    console.error("Edition generation failed without caching fallback", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const budgetLimited = /budget|rate limit|try again later/i.test(message);

    return errorEdition(
      displayQuery,
      lang,
      budgetLimited
        ? "Search capacity is paused to keep daily API costs under control. Please try again later."
        : displayQuery
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
