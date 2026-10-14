import type { TeletextEdition, TeletextStory } from "./types";

const LANGUAGES = ["en", "sv", "de", "es", "fr"] as const;
type Language = typeof LANGUAGES[number];

type LocalizedText = {
  category: string;
  headline: string;
  paragraphs: string[];
  highlightParagraph: number | null;
};

type EditedStory = LocalizedText & {
  trend: string;
  sources: Array<{ label: string; url: string }>;
  translations: Record<Exclude<Language, "en">, LocalizedText>;
};

const localizedSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    category: { type: "string" },
    headline: { type: "string" },
    paragraphs: { type: "array", minItems: 1, maxItems: 2, items: { type: "string" } },
    highlightParagraph: { anyOf: [{ type: "integer" }, { type: "null" }] }
  },
  required: ["category", "headline", "paragraphs", "highlightParagraph"]
};

const globalSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    stories: {
      type: "array", minItems: 4, maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          ...localizedSchema.properties,
          trend: { type: "string" },
          sources: {
            type: "array", minItems: 1, maxItems: 4,
            items: {
              type: "object",
              additionalProperties: false,
              properties: { label: { type: "string" }, url: { type: "string" } },
              required: ["label", "url"]
            }
          },
          translations: {
            type: "object",
            additionalProperties: false,
            properties: { sv: localizedSchema, de: localizedSchema, es: localizedSchema, fr: localizedSchema },
            required: ["sv", "de", "es", "fr"]
          }
        },
        required: ["category", "headline", "paragraphs", "highlightParagraph", "trend", "sources", "translations"]
      }
    }
  },
  required: ["stories"]
};

function clean(value: string) {
  return value.replace(/<grok\\b[^>]*\\/?\\s*>/gi, "").replace(/\\s{2,}/g, " ").trim();
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function storyText(value: LocalizedText) {
  return {
    category: clean(value.category),
    headline: clean(value.headline),
    paragraphs: value.paragraphs.map(clean).filter(Boolean),
    highlightParagraph: value.highlightParagraph
  };
}

function outputText(response: any): string {
  if (typeof response?.output_text === "string") return response.output_text;
  for (const item of Array.isArray(response?.output) ? response.output : []) {
    if (item?.type !== "message") continue;
    for (const part of Array.isArray(item.content) ? item.content : []) {
      if (part?.type === "output_text" && typeof part.text === "string") return part.text;
    }
  }
  throw new Error("xAI response did not contain output text");
}

export async function buildDailyEditions(): Promise<Record<Language, TeletextEdition>> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("XAI_API_KEY is not configured on the Vercel production project");

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const prompt = `Create ONE daily world-news Teletext bulletin about important current conversations on X.

Use one concise X search. Select 4-6 substantive widely relevant news stories, not spam, marketing, fandom or rumors presented as fact. X is a source of claims, not proof: attribute disputes clearly. Return exact real X status URLs for each story. No web search or follow-up investigation.

For each story:
- English original: category, headline (55 characters max), 1-2 short paragraphs for a 40-column Teletext screen, highlightParagraph.
- Translate the SAME story into Swedish (sv), German (de), Spanish (es), and French (fr) in the translations object. Preserve meaning, caveats, and page numbers; keep translated headlines compact.
- Shared: trend and original X post sources.
- Produce ALL languages together in this one structured response. Do not call a translation tool or request other turns.

Current UTC time: ${now.toISOString()}`;

  // Exactly one provider HTTP request for the entire daily bulletin, including
  // all translations. No user-facing routes import or call this function.
  const response = await fetch("https://api.x.ai/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.XAI_MODEL || "grok-4.7",
      reasoning: { effort: "low" },
      max_turns: 1,
      parallel_tool_calls: false,
      max_output_tokens: 6200,
      prompt_cache_key: "teletext-daily-five-languages-v1",
      input: prompt,
      tools: [{ type: "x_search", from_date: isoDate(yesterday), to_date: isoDate(now) }],
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: "teletext_global_daily",
          strict: true,
          schema: globalSchema
        }
      }
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(180_000)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Daily xAI editor failed (${response.status}): ${error.slice(0, 350)}`);
  }

  const raw = await response.json();
  const usage = raw?.usage || {};
  console.info("teletext:daily_xai_usage", {
    costUsd: Number(usage.cost_in_usd_ticks || 0) / 10_000_000_000,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    xSearchCalls: usage.server_side_tool_usage_details?.x_search_calls
  });
  const parsed = JSON.parse(outputText(raw)) as { stories: EditedStory[] };
  const updatedAt = new Date().toISOString();
  const editions = {} as Record<Language, TeletextEdition>;

  for (const language of LANGUAGES) {
    const stories: TeletextStory[] = parsed.stories.map((story, index) => {
      const localized = language === "en" ? story : story.translations?.[language];
      if (!localized) throw new Error("Missing language " + language);
      const sources = story.sources
        .filter((source) => /^https:\/\/(?:www\.)?x\.com\/[^/]+\/status\/\d+/i.test(source.url))
        .slice(0, 4);
      if (!sources.length) throw new Error("Story missing X source URLs");
      return {
        page: 101 + index,
        ...storyText(localized),
        trend: clean(story.trend),
        sources,
        sourcePosts: sources.map((source, i) => ({
          id: `${101 + index}-${i}`,
          text: source.label,
          url: source.url
        }))
      };
    });
    editions[language] = {
      updatedAt,
      mode: "live",
      basis: "Worldwide X-derived bulletin. One scheduled update per UTC day.",
      trends: stories.map((story) => story.trend || story.headline),
      stories,
      language
    };
  }
  return editions;
}
