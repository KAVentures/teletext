import type { TeletextEdition, TeletextStory } from "./types";
import type { XSignalBundle } from "./x";

type EditedStory = {
  category: string;
  headline: string;
  paragraphs: string[];
  highlightParagraph: number | null;
  trend: string;
  sources: Array<{ label: string; url: string }>;
};

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    stories: {
      type: "array",
      minItems: 6,
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          category: { type: "string" },
          headline: { type: "string" },
          paragraphs: {
            type: "array",
            minItems: 2,
            maxItems: 4,
            items: { type: "string" }
          },
          highlightParagraph: { anyOf: [{ type: "integer" }, { type: "null" }] },
          trend: { type: "string" },
          sources: {
            type: "array",
            minItems: 1,
            maxItems: 5,
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

function outputText(response: any): string {
  if (typeof response?.output_text === "string") return response.output_text;
  const parts = Array.isArray(response?.output) ? response.output : [];
  for (const item of parts) {
    if (item?.type !== "message" || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (content?.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  throw new Error("OpenAI response did not contain output text");
}

export async function editSignalsIntoEdition(signals: XSignalBundle): Promise<TeletextEdition> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const model = process.env.OPENAI_MODEL || "gpt-5";
  const useWebSearch = (process.env.OPENAI_WEB_SEARCH || "true").toLowerCase() !== "false";
  const compactPosts = signals.posts.slice(0, 30).map((post) => ({
    text: post.text.slice(0, 500),
    username: post.username || "",
    engagement: post.engagement,
    url: post.url || ""
  }));

  const prompt = `
You are the editor of a minimalist live Teletext news service.

The discovery signal is whatever is currently trending on X. Use the supplied X trends and sampled posts to work out WHY people are discussing each trend. Select only the 6-10 items that are genuinely useful as news right now. Do not mechanically include every trend: spam, fandom chatter, memes, duplicate topics and engagement bait can be excluded.

Editorial rules:
- Popularity is not truth.
- Never convert an unsupported allegation from X into a factual claim.
- If web search is available, verify consequential factual claims against primary sources or reputable reporting before writing them.
- If a claim remains uncertain, attribute it explicitly ("Posts on X are discussing...", "Unconfirmed reports...").
- Prefer concrete developments over generic discourse.
- Keep each headline under about 55 characters.
- Each paragraph should be compact enough for a roughly 40-column Teletext display; normally 1-3 short sentences.
- Avoid hype, clickbait and editorializing.
- Sources must be real URLs you actually relied on. Include original X post URLs when they materially support the story.
- Output is for a continuously updating worldwide edition.

Current X trends:
${JSON.stringify(signals.trends)}

Sampled recent X posts:
${JSON.stringify(compactPosts)}
`;

  const body: any = {
    model,
    input: prompt,
    text: {
      verbosity: "low",
      format: {
        type: "json_schema",
        name: "teletext_edition",
        strict: true,
        schema
      }
    }
  };

  if (useWebSearch) {
    body.tools = [{ type: "web_search", search_context_size: "low" }];
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI editor failed (${response.status}): ${error.slice(0, 400)}`);
  }

  const parsedResponse = await response.json();
  const parsed = JSON.parse(outputText(parsedResponse)) as { stories: EditedStory[] };

  const stories: TeletextStory[] = parsed.stories.map((story, index) => {
    const trendNeedle = story.trend.toLowerCase().replace(/^#/, "").trim();
    return {
      ...story,
      page: 101 + index,
      sourcePosts: trendNeedle
        ? signals.posts
            .filter((post) => post.text.toLowerCase().includes(trendNeedle))
            .slice(0, 3)
            .map((post) => ({
              id: post.id,
              username: post.username,
              text: post.text,
              url: post.url
            }))
        : []
    };
  });

  return {
    updatedAt: new Date().toISOString(),
    mode: "live",
    basis: "Trending on X, edited by AI and web-checked where available.",
    trends: signals.trends,
    stories
  };
}
