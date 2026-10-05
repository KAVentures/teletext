import type { TeletextEdition, TeletextStory } from "./types";
import type { TopicPost } from "./x";

type GlobalEditedStory = {
  category: string;
  headline: string;
  paragraphs: string[];
  highlightParagraph: number | null;
  trend: string;
  sources: Array<{ label: string; url: string }>;
};

type TopicEditedStory = {
  category: string;
  headline: string;
  paragraphs: string[];
  highlightParagraph: number | null;
  sourcePostIds: string[];
};

const languageNames: Record<string, string> = {
  en: "English",
  sv: "Swedish",
  de: "German",
  es: "Spanish",
  fr: "French"
};

const globalSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    stories: {
      type: "array",
      minItems: 5,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          category: { type: "string" },
          headline: { type: "string" },
          paragraphs: {
            type: "array",
            minItems: 1,
            maxItems: 3,
            items: { type: "string" }
          },
          highlightParagraph: { anyOf: [{ type: "integer" }, { type: "null" }] },
          trend: { type: "string" },
          sources: {
            type: "array",
            minItems: 1,
            maxItems: 4,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                label: { type: "string" },
                url: { type: "string" }
              },
              required: ["label", "url"]
            }
          }
        },
        required: ["category", "headline", "paragraphs", "highlightParagraph", "trend", "sources"]
      }
    }
  },
  required: ["stories"]
};

const topicSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    stories: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          category: { type: "string" },
          headline: { type: "string" },
          paragraphs: {
            type: "array",
            minItems: 1,
            maxItems: 2,
            items: { type: "string" }
          },
          highlightParagraph: { anyOf: [{ type: "integer" }, { type: "null" }] },
          sourcePostIds: {
            type: "array",
            minItems: 1,
            maxItems: 5,
            items: { type: "string" }
          }
        },
        required: ["category", "headline", "paragraphs", "highlightParagraph", "sourcePostIds"]
      }
    }
  },
  required: ["stories"]
};

const topicToolSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    stories: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          category: { type: "string" },
          headline: { type: "string" },
          paragraphs: {
            type: "array",
            minItems: 1,
            maxItems: 2,
            items: { type: "string" }
          },
          highlightParagraph: { anyOf: [{ type: "integer" }, { type: "null" }] },
          sources: {
            type: "array",
            minItems: 1,
            maxItems: 4,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                label: { type: "string" },
                url: { type: "string" }
              },
              required: ["label", "url"]
            }
          }
        },
        required: ["category", "headline", "paragraphs", "highlightParagraph", "sources"]
      }
    }
  },
  required: ["stories"]
};

function cleanModelText(value: string) {
  return value
    .replace(/<grok\b[^>]*\/?\s*>/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function cleanParagraphs(values: string[]) {
  return values.map(cleanModelText).filter(Boolean);
}

async function fetchXaiResponses(body: unknown) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("XAI_API_KEY is not configured");

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await fetch("https://api.x.ai/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body),
        cache: "no-store"
      });
    } catch (error) {
      if (attempt === 1) throw error;
      // Retry only transport-level failures. HTTP errors are returned normally and
      // are never auto-retried, avoiding accidental duplicate paid tool work.
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  throw new Error("xAI request failed");
}

function outputText(response: any): string {
  if (typeof response?.output_text === "string") return response.output_text;
  const parts = Array.isArray(response?.output) ? response.output : [];
  for (const item of parts) {
    if (item?.type !== "message" || !Array.isArray(item.content)) continue;
    for (const part of item.content) {
      if (part?.type === "output_text" && typeof part.text === "string") return part.text;
    }
  }
  throw new Error("xAI response did not contain output text");
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function logUsage(kind: string, raw: any) {
  const usage = raw?.usage;
  if (!usage) return;

  const ticks = Number(usage.cost_in_usd_ticks || 0);
  const details = usage.server_side_tool_usage_details || {};
  console.info("teletext:xai_usage", {
    kind,
    costUsd: ticks ? ticks / 10_000_000_000 : undefined,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    reasoningTokens: usage.output_tokens_details?.reasoning_tokens,
    cachedInputTokens: usage.input_tokens_details?.cached_tokens,
    xPostsFetched: details.x_posts_fetched,
    xUsersFetched: details.x_users_fetched,
    xSearchCalls: details.x_search_calls,
    webSearchCalls: details.web_search_calls
  });
}

function safeSources(sources: Array<{ label: string; url: string }>) {
  return sources.filter((source) => /^https:\/\//i.test(source.url)).slice(0, 4);
}

export async function buildGlobalEditionWithGrok(language: string): Promise<TeletextEdition> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("XAI_API_KEY is not configured");

  const model = process.env.XAI_MODEL || "grok-4.7";
  const useWebSearch = (process.env.XAI_WEB_SEARCH || "true").toLowerCase() !== "false";
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const outputLanguage = languageNames[language] || "English";

  const prompt = `
You are the editor of a live worldwide Teletext news service.

Use X Search to determine what is genuinely trending and being discussed on X right now worldwide. Treat X as the live signal layer, not as a truth source. Select only 5-8 genuinely useful current stories. Merge duplicate trends and exclude spam, engagement bait, fandom-only noise, context-free memes and generic discourse unless they correspond to important news.

Write ALL headlines, categories and paragraphs in ${outputLanguage}. Discover evidence globally regardless of source language. Keep source names and URLs in their original form.

Rules:
- Prefer concrete new developments.
- Never turn an unsupported allegation into fact.
- When consequential factual claims are involved, use Web Search when available to corroborate them with primary sources or reputable reporting.
- If uncertainty remains, say so explicitly.
- Rank from most important to least important.
- Headline: about 55 characters maximum.
- Each story: 1-3 very compact paragraphs suitable for a 40-column Teletext display.
- Use at most four real source URLs you actually relied on.
- Return only the requested structured edition.

Current UTC time: ${now.toISOString()}
`;

  const tools: any[] = [{
    type: "x_search",
    from_date: isoDate(yesterday),
    to_date: isoDate(now)
  }];
  if (useWebSearch) tools.push({ type: "web_search" });

  const response = await fetchXaiResponses({
    model,
    reasoning: { effort: "low" },
    prompt_cache_key: "teletext-global-editor-v2",
    input: prompt,
    tools,
    store: false,
    text: {
      format: {
        type: "json_schema",
        name: "teletext_global_edition",
        strict: true,
        schema: globalSchema
      }
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`xAI Grok global editor failed (${response.status}): ${error.slice(0, 600)}`);
  }

  const raw = await response.json();
  logUsage("global", raw);
  const parsed = JSON.parse(outputText(raw)) as { stories: GlobalEditedStory[] };

  const stories: TeletextStory[] = parsed.stories.map((story, index) => {
    const sources = safeSources(story.sources);
    return {
      category: cleanModelText(story.category),
      headline: cleanModelText(story.headline),
      paragraphs: cleanParagraphs(story.paragraphs),
      highlightParagraph: story.highlightParagraph,
      trend: cleanModelText(story.trend),
      sources,
      page: 101 + index,
      sourcePosts: sources
        .filter((source) => /https:\/\/(?:www\.)?x\.com\//i.test(source.url))
        .map((source, sourceIndex) => ({
          id: `${101 + index}-${sourceIndex}`,
          text: source.label,
          url: source.url
        }))
    };
  });

  return {
    updatedAt: new Date().toISOString(),
    mode: "live",
    basis: "Current worldwide X conversation, edited by Grok 4.7 at low reasoning and web-checked where needed.",
    trends: parsed.stories.map((story) => story.trend),
    stories,
    language
  };
}

export async function buildTopicEditionFromPosts({
  query,
  language,
  posts
}: {
  query: string;
  language: string;
  posts: TopicPost[];
}): Promise<TeletextEdition> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("XAI_API_KEY is not configured");
  if (!posts.length) throw new Error("No X posts found for topic");

  const model = process.env.XAI_MODEL || "grok-4.7";
  const outputLanguage = languageNames[language] || "English";

  const evidence = posts.map((post) => ({
    id: post.id,
    username: post.username || "",
    createdAt: post.createdAt || "",
    engagement: post.engagement,
    text: post.text.slice(0, 550),
    url: post.url || ""
  }));

  const prompt = `
You are producing a fast Teletext briefing about this exact user topic: "${query}".

Below are the 10 most recent X posts fetched directly by the application. Use ONLY this supplied evidence. Do not call tools, do not add facts from memory, and do not invent sources.

Write in ${outputLanguage}. Create 1-5 concise updates or angles that summarize what the supplied X posts actually establish. Merge duplicates. Prefer the strongest and most relevant evidence. If a claim is only an allegation or opinion, attribute it clearly.

For every story, sourcePostIds MUST contain only IDs from the supplied evidence and MUST identify the exact posts used to write that story. These IDs are displayed to users as clickable source links.

Keep headlines under about 55 characters. Use 1-2 compact paragraphs per story. Return only the requested structured output.

X evidence:
${JSON.stringify(evidence)}
`;

  const response = await fetchXaiResponses({
    model,
    reasoning: { effort: "low" },
    prompt_cache_key: "teletext-topic-editor-v2",
    input: prompt,
    store: false,
    text: {
      format: {
        type: "json_schema",
        name: "teletext_topic_edition",
        strict: true,
        schema: topicSchema
      }
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`xAI Grok topic editor failed (${response.status}): ${error.slice(0, 600)}`);
  }

  const raw = await response.json();
  logUsage("topic_summary", raw);
  const parsed = JSON.parse(outputText(raw)) as { stories: TopicEditedStory[] };
  const postMap = new Map(posts.map((post) => [post.id, post]));

  const stories: TeletextStory[] = parsed.stories.map((story, index) => {
    const sourcePosts = story.sourcePostIds
      .map((id) => postMap.get(id))
      .filter((post): post is TopicPost => Boolean(post))
      .slice(0, 5)
      .map((post) => ({
        id: post.id,
        username: post.username,
        text: post.text,
        url: post.url
      }));

    const sources = sourcePosts.map((post) => ({
      label: post.username ? `@${post.username}` : "X post",
      url: post.url
    }));

    return {
      page: 901 + index,
      category: cleanModelText(story.category),
      headline: cleanModelText(story.headline),
      paragraphs: cleanParagraphs(story.paragraphs),
      highlightParagraph: story.highlightParagraph,
      trend: query,
      sourcePosts,
      sources
    };
  });

  return {
    updatedAt: new Date().toISOString(),
    mode: "live",
    basis: `Latest X posts about "${query}", fetched directly and summarized by Grok 4.7 at low reasoning.`,
    trends: [query],
    stories,
    language,
    query
  };
}

export async function buildTopicEditionWithGrokSearch({
  query,
  language
}: {
  query: string;
  language: string;
}): Promise<TeletextEdition> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("XAI_API_KEY is not configured");

  const model = process.env.XAI_MODEL || "grok-4.7";
  const outputLanguage = languageNames[language] || "English";
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const prompt = `
Create a FAST, LOW-COST Teletext briefing about this exact topic: "${query}".

Use X Search only. Search the last 24 hours. Use as little tool work as possible: make one X search pass if you can, do not fetch user profiles or whole threads unless absolutely necessary, and stop once you have enough evidence for 1-4 concise updates.

Write in ${outputLanguage}. Treat X as evidence, not automatic truth. If a claim is uncertain or comes from one account, attribute it explicitly.

For every story, "sources" must contain ONLY real X post URLs that you actually used to write that story. Do not invent URLs and do not cite generic X profile pages.

Headline: about 55 characters maximum.
Each story: 1-2 compact paragraphs.
Return only the requested structured output.
`;

  const response = await fetchXaiResponses({
    model,
    reasoning: { effort: "low" },
    prompt_cache_key: "teletext-topic-xsearch-v1",
    input: prompt,
    tools: [{
      type: "x_search",
      from_date: isoDate(yesterday),
      to_date: isoDate(now)
    }],
    store: false,
    text: {
      format: {
        type: "json_schema",
        name: "teletext_topic_xsearch",
        strict: true,
        schema: topicToolSchema
      }
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`xAI Grok X Search topic editor failed (${response.status}): ${error.slice(0, 600)}`);
  }

  const raw = await response.json();
  logUsage("topic_x_search_fallback", raw);
  const parsed = JSON.parse(outputText(raw)) as {
    stories: Array<{
      category: string;
      headline: string;
      paragraphs: string[];
      highlightParagraph: number | null;
      sources: Array<{ label: string; url: string }>;
    }>;
  };

  const allCitations = Array.isArray(raw?.citations)
    ? raw.citations.filter((url: unknown): url is string => typeof url === "string" && /https:\/\/(?:www\.)?x\.com\//i.test(url))
    : [];

  const stories: TeletextStory[] = parsed.stories.map((story, index) => {
    let sources = safeSources(story.sources).filter((source) => /https:\/\/(?:www\.)?x\.com\//i.test(source.url));

    // If structured source mapping is unexpectedly empty, retain traceability by
    // exposing the X URLs the tool actually returned rather than inventing any.
    if (!sources.length) {
      sources = allCitations.slice(0, 4).map((url: string, sourceIndex: number) => ({
        label: `X source ${sourceIndex + 1}`,
        url
      }));
    }

    return {
      page: 901 + index,
      category: cleanModelText(story.category),
      headline: cleanModelText(story.headline),
      paragraphs: cleanParagraphs(story.paragraphs),
      highlightParagraph: story.highlightParagraph,
      trend: query,
      sources,
      sourcePosts: sources.map((source, sourceIndex) => ({
        id: `${901 + index}-${sourceIndex}`,
        text: source.label,
        url: source.url
      }))
    };
  });

  return {
    updatedAt: new Date().toISOString(),
    mode: "live",
    basis: `Latest X conversation about "${query}", searched by Grok 4.7 at low reasoning.`,
    trends: [query],
    stories,
    language,
    query
  };
}

export async function buildTopicEditionWithXWebSearch({
  query,
  language
}: {
  query: string;
  language: string;
}): Promise<TeletextEdition> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("XAI_API_KEY is not configured");

  const model = process.env.XAI_MODEL || "grok-4.7";
  const outputLanguage = languageNames[language] || "English";

  const prompt = `
Create a fast Teletext briefing about this exact topic: "${query}".

Use Web Search restricted to x.com to find the freshest relevant public X posts. Keep the search shallow and cheap: make one focused search pass if possible and stop once you have enough evidence for 1-3 concise updates.

Write in ${outputLanguage}. Treat posts as claims/evidence, not automatic truth. Attribute uncertain claims clearly.

For every story, "sources" must contain ONLY actual x.com post/status URLs that you used. Do not cite profile pages, search pages, or invented URLs.

Headline: about 55 characters maximum.
Each story: 1-2 compact paragraphs.
Return only the requested structured output.
`;

  const response = await fetchXaiResponses({
    model,
    reasoning: { effort: "low" },
    prompt_cache_key: "teletext-topic-xweb-v1",
    input: prompt,
    tools: [{
      type: "web_search",
      allowed_domains: ["x.com"]
    }],
    store: false,
    text: {
      format: {
        type: "json_schema",
        name: "teletext_topic_xweb",
        strict: true,
        schema: topicToolSchema
      }
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`xAI X-web topic editor failed (${response.status}): ${error.slice(0, 600)}`);
  }

  const raw = await response.json();
  logUsage("topic_x_web_search", raw);
  const parsed = JSON.parse(outputText(raw)) as {
    stories: Array<{
      category: string;
      headline: string;
      paragraphs: string[];
      highlightParagraph: number | null;
      sources: Array<{ label: string; url: string }>;
    }>;
  };

  const allCitations = Array.isArray(raw?.citations)
    ? raw.citations.filter((url: unknown): url is string =>
        typeof url === "string" &&
        /https:\/\/(?:www\.)?x\.com\/[^/]+\/status\/\d+/i.test(url)
      )
    : [];

  const stories: TeletextStory[] = parsed.stories.map((story, index) => {
    let sources = safeSources(story.sources).filter((source) =>
      /https:\/\/(?:www\.)?x\.com\/[^/]+\/status\/\d+/i.test(source.url)
    );

    if (!sources.length) {
      sources = allCitations.slice(0, 4).map((url: string, sourceIndex: number) => ({
        label: `X source ${sourceIndex + 1}`,
        url
      }));
    }

    if (!sources.length) {
      throw new Error("X-restricted web search returned no usable X post URLs");
    }

    return {
      page: 901 + index,
      category: cleanModelText(story.category),
      headline: cleanModelText(story.headline),
      paragraphs: cleanParagraphs(story.paragraphs),
      highlightParagraph: story.highlightParagraph,
      trend: query,
      sources,
      sourcePosts: sources.map((source, sourceIndex) => ({
        id: `${901 + index}-${sourceIndex}`,
        text: source.label,
        url: source.url
      }))
    };
  });

  return {
    updatedAt: new Date().toISOString(),
    mode: "live",
    basis: `Latest public X posts about "${query}", found through a low-cost X-restricted web search and summarized by Grok 4.7.`,
    trends: [query],
    stories,
    language,
    query
  };
}
