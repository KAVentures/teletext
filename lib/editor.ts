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

  const response = await fetch("https://api.x.ai/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
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
    }),
    cache: "no-store"
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
      ...story,
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

  const response = await fetch("https://api.x.ai/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
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
    }),
    cache: "no-store"
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
      category: story.category,
      headline: story.headline,
      paragraphs: story.paragraphs,
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
