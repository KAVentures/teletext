import { unstable_cache } from "next/cache";
import { mockEdition } from "./mock-edition";
import {
  buildGlobalBaseEdition,
  fetchProfileEdition,
  translateEdition
} from "./editor";
import type { TeletextEdition, TeletextStory } from "./types";

export const supportedLanguages = ["en", "sv", "de", "es", "fr"] as const;

const GLOBAL_REVALIDATE_SECONDS = 24 * 60 * 60;
const PROFILE_REVALIDATE_SECONDS = 7 * 24 * 60 * 60;
const TRANSLATION_REVALIDATE_SECONDS = 24 * 60 * 60;
const MAX_HANDLES = 5;

export function normalizeLanguage(value?: string) {
  const lang = (value || "en").toLowerCase();
  return supportedLanguages.includes(lang as (typeof supportedLanguages)[number]) ? lang : "en";
}

export function normalizeHandle(value?: string) {
  const cleaned = (value || "").trim().replace(/^@+/, "");
  if (!/^[A-Za-z0-9_]{1,15}$/.test(cleaned)) return "";
  return cleaned.toLowerCase();
}

export function normalizeHandles(value?: string | string[]) {
  const raw = Array.isArray(value) ? value : (value || "").split(",");
  const handles: string[] = [];

  for (const item of raw) {
    const handle = normalizeHandle(item);
    if (!handle || handles.includes(handle)) continue;
    handles.push(handle);
    if (handles.length >= MAX_HANDLES) break;
  }

  return handles;
}

function errorEdition(language: string, message: string, handles?: string[]): TeletextEdition {
  return {
    updatedAt: new Date().toISOString(),
    mode: "error",
    basis: message,
    trends: [],
    stories: [],
    language,
    ...(handles?.length ? { handles } : {})
  };
}

async function buildGlobalBase(): Promise<TeletextEdition> {
  if (!process.env.XAI_API_KEY) {
    if (process.env.NODE_ENV !== "production") {
      return { ...mockEdition, language: "en", updatedAt: new Date().toISOString() };
    }
    throw new Error("XAI_API_KEY is not configured");
  }

  return buildGlobalBaseEdition();
}

async function buildProfile(handle: string): Promise<TeletextEdition> {
  if (!process.env.XAI_API_KEY) {
    throw new Error("XAI_API_KEY is not configured");
  }

  return fetchProfileEdition(handle);
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
  ["teletext-global-base-v9"],
  { revalidate: GLOBAL_REVALIDATE_SECONDS, tags: ["teletext-global-base"] }
);

const cachedProfile = unstable_cache(
  buildProfile,
  ["teletext-profile-v1"],
  { revalidate: PROFILE_REVALIDATE_SECONDS, tags: ["teletext-profile"] }
);

const cachedTranslation = unstable_cache(
  translateSerializedEdition,
  ["teletext-edition-translation-v3"],
  { revalidate: TRANSLATION_REVALIDATE_SECONDS, tags: ["teletext-translation"] }
);

async function localizeGlobal(
  edition: TeletextEdition,
  language: string
): Promise<TeletextEdition> {
  if (language === "en" || edition.stories.length === 0) {
    return { ...edition, language };
  }

  return cachedTranslation(JSON.stringify(edition), language);
}

export async function getGlobalEdition(language?: string) {
  const lang = normalizeLanguage(language);

  try {
    const base = await cachedGlobalBase();
    return await localizeGlobal(base, lang);
  } catch (error) {
    console.error("Global edition generation failed", error);
    return errorEdition(
      lang,
      "Could not refresh the live edition right now. Please retry later."
    );
  }
}

export async function getMyXEdition({
  handles,
  language
}: {
  handles?: string | string[];
  language?: string;
}) {
  const lang = normalizeLanguage(language);
  const selected = normalizeHandles(handles);

  if (!selected.length) {
    return makeMyXShellEdition(lang);
  }

  const results = await Promise.allSettled(
    selected.map((handle) => cachedProfile(handle))
  );

  const stories: TeletextStory[] = [];
  const failed: string[] = [];

  results.forEach((result, profileIndex) => {
    const handle = selected[profileIndex];

    if (result.status === "rejected") {
      failed.push(handle);
      console.error(`Profile fetch failed for @${handle}`, result.reason);
      return;
    }

    for (const story of result.value.stories) {
      stories.push({
        ...story,
        category: `@${handle}`,
        trend: `@${handle}`
      });
    }
  });

  if (!stories.length) {
    return errorEdition(
      lang,
      "Could not load these X profiles right now. Please try again later.",
      selected
    );
  }

  stories.sort((a, b) => {
    const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return bTime - aTime;
  });

  const numbered = stories.slice(0, 10).map((story, index) => ({
    ...story,
    page: 801 + index
  }));

  return {
    updatedAt: new Date().toISOString(),
    mode: "live" as const,
    basis: failed.length
      ? `Recent posts from your selected X profiles. Could not refresh: ${failed.map((h) => `@${h}`).join(", ")}.`
      : "Recent posts from your selected X profiles. Post text stays in its original language to keep My X extremely cheap.",
    trends: selected.map((handle) => `@${handle}`),
    stories: numbered,
    language: lang,
    handles: selected
  };
}

export function makeMyXShellEdition(language?: string): TeletextEdition {
  const lang = normalizeLanguage(language);
  return {
    updatedAt: new Date().toISOString(),
    mode: "live",
    basis: "Add up to five X profiles. Their recent posts become your personal Teletext pages.",
    trends: [],
    stories: [],
    language: lang,
    handles: []
  };
}
