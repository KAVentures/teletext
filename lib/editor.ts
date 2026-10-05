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

type ToolTopicStory = {
  category: string;
  headline: string;
  paragraphs: string[];
  highlightParagraph: number | null;
  sources: Array<{ label: string; url: string }>;
};

type TranslationStory = {
  page: number;
  category: string;
  headline: string;
  paragraphs: string[];
  highlightParagraph: number | null;
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
      minItems: 4,
      maxItems: 6,
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

const topicDirectSchema = {
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
          sourcePostIds: {
            type: "array",
            minItems: 1,
            maxItems: 4,
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

const translationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    stories: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          page: { type: "integer" },
          category: { type: "string" },
          headline: { type: "string" },
          paragraphs: {
            type: "array",
            minItems: 1,
            maxItems: 2,
            items: { type: "string" }
          },
          highlightParagraph: { anyOf: [{ type: "integer" }, { type: "null" }] }
        },
        required: ["page", "category", "headline", "paragraphs", "highlightParagraph"]
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
  return sources
    .filter((source) => /^https:\/\//i.test(source.url))
    .slice(0, 4);
}

function xStatusSources(sources: Array<{ label: string; url: string }>) {
  return safeSources(sources).filter((source) =>
    /https:\/\/(?:www\.)?x\.com\/[^/]+\/status\/\d+/i.test(source.url)
  );
}

export async function buildGlobalBaseEdition(): Promise<TeletextEdition> {
  const model = process.env.XAI_MODEL || "grok-4.7";
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const prompt = `
You edit a finite worldwide Teletext bulletin based on what is attracting meaningful attention on X right now.

Use ONE concise X-search turn. Gather only enough evidence for 4-6 important stories. Do not keep researching once you can identify the main current conversations.

Rules:
- X attention is the discovery signal, not proof.
- Prefer concrete new developments with broad relevance.
- Merge duplicates and exclude spam, engagement bait, fandom-only noise and context-free memes.
- Attribute unsupported or disputed claims explicitly.
- Write in English.
- Headline: ~55 characters maximum.
- Each story: 1-2 compact paragraphs for a 40-column Teletext display.
- Return real X post/status URLs actually used for each story.
- No web search and no extra verification pass; keep this cheap and fast.
- Return only the requested structured output.

Current UTC time: ${now.toISOString()}
`;

  const response = await fetchXaiResponses({
    model,
    reasoning: { effort: "low" },
    max_turns: 1,
    parallel_tool_calls: false,
    max_output_tokens: 1100,
    prompt_cache_key: "teletext-global-base-v1",
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
        name: "teletext_global_base",
        strict: true,
        schema: globalSchema
      }
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`xAI global editor failed (${response.status}): ${error.slice(0, 600)}`);
  }

  const raw = await response.json();
  logUsage("global_base", raw);
  const parsed = JSON.parse(outputText(raw)) as { stories: GlobalEditedStory[] };

  const stories: TeletextStory[] = parsed.stories.map((story, index) => {
    const sources = safeSources(story.sources);
    return {
      page: 101 + index,
      category: cleanModelText(story.category),
      headline: cleanModelText(story.headline),
      paragraphs: cleanParagraphs(story.paragraphs),
      highlightParagraph: story.highlightParagraph,
      trend: cleanModelText(story.trend),
      sources,
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
    basis: "Current worldwide X conversation, refreshed at most every four hours.",
    trends: stories.map((story) => story.trend || story.headline),
    stories,
    language: "en"
  };
}

export async function buildTopicEditionFromPosts({
  query,
  posts
}: {
  query: string;
  posts: TopicPost[];
}): Promise<TeletextEdition> {
  if (!posts.length) throw new Error("No X posts found for topic");

  const model = process.env.XAI_MODEL || "grok-4.7";
  const evidence = posts.slice(0, 10).map((post) => ({
    id: post.id,
    username: post.username || "",
    createdAt: post.createdAt || "",
    engagement: post.engagement,
    text: post.text.slice(0, 500),
    url: post.url || ""
  }));

  const prompt = `
Create a fast English Teletext briefing about this exact topic: "${query}".

Use ONLY the supplied X evidence. Do not call tools and do not add facts from memory. Create 1-3 compact updates. Merge duplicates and attribute allegations/opinions clearly.

For every story, sourcePostIds MUST contain only IDs from the supplied evidence and identify the exact posts used for that story.

Headline: ~55 characters maximum.
Each story: 1-2 compact paragraphs.
Return only the requested structured output.

X evidence:
${JSON.stringify(evidence)}
`;

  const response = await fetchXaiResponses({
    model,
    reasoning: { effort: "low" },
    max_output_tokens: 700,
    prompt_cache_key: "teletext-topic-direct-v3",
    input: prompt,
    store: false,
    text: {
      format: {
        type: "json_schema",
        name: "teletext_topic_direct",
        strict: true,
        schema: topicDirectSchema
      }
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`xAI topic editor failed (${response.status}): ${error.slice(0, 600)}`);
  }

  const raw = await response.json();
  logUsage("topic_direct", raw);
  const parsed = JSON.parse(outputText(raw)) as { stories: TopicEditedStory[] };
  const postMap = new Map(posts.map((post) => [post.id, post]));

  const stories: TeletextStory[] = parsed.stories.map((story, index) => {
    const sourcePosts = story.sourcePostIds
      .map((id) => postMap.get(id))
      .filter((post): post is TopicPost => Boolean(post))
      .slice(0, 4)
      .map((post) => ({
        id: post.id,
        username: post.username,
        text: post.text,
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
      sources: sourcePosts.map((post) => ({
        label: post.username ? `@${post.username}` : "X post",
        url: post.url
      }))
    };
  });

  return {
    updatedAt: new Date().toISOString(),
    mode: "live",
    basis: `Latest cached X briefing about "${query}".`,
    trends: [query],
    stories,
    language: "en",
    query
  };
}

export async function buildTopicBaseWithXWebSearch(query: string): Promise<TeletextEdition> {
  const model = process.env.XAI_MODEL || "grok-4.7";

  const prompt = `
Create a FAST, LOW-COST English Teletext briefing about this exact topic: "${query}".

Use ONE focused Web Search turn restricted to x.com. Stop after enough evidence for 1-3 concise updates.

Rules:
- Use only fresh, relevant public X posts.
- Treat posts as claims/evidence, not automatic truth.
- Attribute uncertain claims clearly.
- Each story must contain ONLY actual x.com post/status URLs used for that story.
- Do not cite profiles or search pages.
- Headline: ~55 characters maximum.
- Each story: 1-2 compact paragraphs.
- Return only the requested structured output.
`;

  const response = await fetchXaiResponses({
    model,
    reasoning: { effort: "low" },
    max_turns: 1,
    parallel_tool_calls: false,
    max_output_tokens: 700,
    prompt_cache_key: "teletext-topic-xweb-v2",
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
  logUsage("topic_x_web_base", raw);
  const parsed = JSON.parse(outputText(raw)) as { stories: ToolTopicStory[] };

  const citations = Array.isArray(raw?.citations)
    ? raw.citations.filter((url: unknown): url is string =>
        typeof url === "string" &&
        /https:\/\/(?:www\.)?x\.com\/[^/]+\/status\/\d+/i.test(url)
      )
    : [];

  const stories: TeletextStory[] = parsed.stories.map((story, index) => {
    let sources = xStatusSources(story.sources);
    if (!sources.length) {
      sources = citations.slice(0, 4).map((url: string, sourceIndex: number) => ({
        label: `X source ${sourceIndex + 1}`,
        url
      }));
    }
    if (!sources.length) throw new Error("Search returned no usable X post URLs");

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
    basis: `Latest cached X briefing about "${query}".`,
    trends: [query],
    stories,
    language: "en",
    query
  };
}

export async function buildTopicBaseWithGrokSearch(query: string): Promise<TeletextEdition> {
  const model = process.env.XAI_MODEL || "grok-4.7";
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const prompt = `
Create a FAST, LOW-COST English Teletext briefing about this exact topic: "${query}".

Use ONE X Search turn only. Stop after enough evidence for 1-3 concise updates. Treat X as evidence, not automatic truth. Attribute uncertain claims clearly.

Every story must include only real X post/status URLs actually used.
Headline: ~55 characters maximum.
Each story: 1-2 compact paragraphs.
Return only the requested structured output.
`;

  const response = await fetchXaiResponses({
    model,
    reasoning: { effort: "low" },
    max_turns: 1,
    parallel_tool_calls: false,
    max_output_tokens: 700,
    prompt_cache_key: "teletext-topic-xsearch-v2",
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
    throw new Error(`xAI X Search topic editor failed (${response.status}): ${error.slice(0, 600)}`);
  }

  const raw = await response.json();
  logUsage("topic_x_search_base", raw);
  const parsed = JSON.parse(outputText(raw)) as { stories: ToolTopicStory[] };

  const citations = Array.isArray(raw?.citations)
    ? raw.citations.filter((url: unknown): url is string =>
        typeof url === "string" &&
        /https:\/\/(?:www\.)?x\.com\/[^/]+\/status\/\d+/i.test(url)
      )
    : [];

  const stories: TeletextStory[] = parsed.stories.map((story, index) => {
    let sources = xStatusSources(story.sources);
    if (!sources.length) {
      sources = citations.slice(0, 4).map((url: string, sourceIndex: number) => ({
        label: `X source ${sourceIndex + 1}`,
        url
      }));
    }
    if (!sources.length) throw new Error("X Search returned no usable X post URLs");

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
    basis: `Latest cached X briefing about "${query}".`,
    trends: [query],
    stories,
    language: "en",
    query
  };
}

export async function translateEdition(
  edition: TeletextEdition,
  language: string
): Promise<TeletextEdition> {
  if (language === "en" || edition.stories.length === 0) {
    return { ...edition, language };
  }

  const model = process.env.XAI_MODEL || "grok-4.7";
  const languageName = languageNames[language] || "English";

  const translationInput = edition.stories.map((story) => ({
    page: story.page,
    category: story.category,
    headline: story.headline,
    paragraphs: story.paragraphs,
    highlightParagraph: story.highlightParagraph ?? null
  }));

  const prompt = `
Translate this Teletext edition into ${languageName}.

Preserve meaning, uncertainty, page numbers and compact style. Do not add facts, remove caveats, call tools, or change sources. Keep headlines short and paragraphs terse.

Stories:
${JSON.stringify(translationInput)}
`;

  const response = await fetchXaiResponses({
    model,
    reasoning: { effort: "low" },
    max_output_tokens: 900,
    prompt_cache_key: "teletext-translation-v1",
    input: prompt,
    store: false,
    text: {
      format: {
        type: "json_schema",
        name: "teletext_translation",
        strict: true,
        schema: translationSchema
      }
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`xAI translation failed (${response.status}): ${error.slice(0, 600)}`);
  }

  const raw = await response.json();
  logUsage("translation", raw);
  const parsed = JSON.parse(outputText(raw)) as { stories: TranslationStory[] };
  const translatedByPage = new Map(parsed.stories.map((story) => [story.page, story]));

  return {
    ...edition,
    language,
    stories: edition.stories.map((story) => {
      const translated = translatedByPage.get(story.page);
      if (!translated) return story;

      return {
        ...story,
        category: cleanModelText(translated.category),
        headline: cleanModelText(translated.headline),
        paragraphs: cleanParagraphs(translated.paragraphs),
        highlightParagraph: translated.highlightParagraph
      };
    })
  };
}

const profilePostsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    posts: {
      type: "array",
      minItems: 0,
      maxItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          text: { type: "string" },
          url: { type: "string" },
          createdAt: { type: "string" }
        },
        required: ["text", "url", "createdAt"]
      }
    }
  },
  required: ["posts"]
};

function postHeadline(text: string) {
  const clean = cleanModelText(text.replace(/https?:\/\/\S+/g, ""));
  const sentence = clean.split(/(?<=[.!?])\s+/)[0] || clean;
  return sentence.length <= 55 ? sentence : sentence.slice(0, 52).trimEnd() + "...";
}

function postParagraphs(text: string) {
  const clean = cleanModelText(text);
  if (clean.length <= 360) return [clean];
  return [clean.slice(0, 357).trimEnd() + "..."];
}

export async function fetchProfileEdition(handle: string): Promise<TeletextEdition> {
  const model = process.env.XAI_MODEL || "grok-4.7";
  const now = new Date();
  const from = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const prompt = `
Fetch up to TWO of the most recent substantive original posts from @${handle}.

Return the post text, exact x.com status URL, and created timestamp. Prefer original posts over replies/reposts. Do not summarize, analyze, browse the web, fetch profiles, or call any additional tools. If fewer than two suitable posts exist in the period, return fewer.

Return only the structured output.
`;

  const response = await fetchXaiResponses({
    model,
    reasoning: { effort: "low" },
    max_turns: 1,
    parallel_tool_calls: false,
    max_output_tokens: 380,
    prompt_cache_key: "teletext-profile-posts-v1",
    input: prompt,
    tools: [{
      type: "x_search",
      allowed_x_handles: [handle],
      from_date: isoDate(from),
      to_date: isoDate(now)
    }],
    store: false,
    text: {
      format: {
        type: "json_schema",
        name: "teletext_profile_posts",
        strict: true,
        schema: profilePostsSchema
      }
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`xAI profile fetch failed (${response.status}): ${error.slice(0, 500)}`);
  }

  const raw = await response.json();
  logUsage("profile_posts", raw);
  const parsed = JSON.parse(outputText(raw)) as {
    posts: Array<{ text: string; url: string; createdAt: string }>;
  };

  const posts = parsed.posts
    .filter((post) => /https:\/\/(?:www\.)?x\.com\/[^/]+\/status\/\d+/i.test(post.url))
    .slice(0, 2);

  const stories: TeletextStory[] = posts.map((post, index) => ({
    page: 501 + index,
    category: `@${handle}`,
    headline: postHeadline(post.text),
    paragraphs: postParagraphs(post.text),
    highlightParagraph: null,
    trend: `@${handle}`,
    sources: [{ label: `@${handle} on X`, url: post.url }],
    sourcePosts: [{
      id: post.url,
      username: handle,
      text: post.text,
      url: post.url
    }]
  }));

  return {
    updatedAt: new Date().toISOString(),
    mode: "live",
    basis: `Recent posts from @${handle} on X.`,
    trends: [`@${handle}`],
    stories,
    language: "original",
    handles: [handle]
  };
}
