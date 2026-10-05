import type { TeletextEdition, TeletextStory } from "./types";

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
    for (const part of item.content) {
      if (part?.type === "output_text" && typeof part.text === "string") return part.text;
    }
  }
  throw new Error("xAI response did not contain output text");
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function buildTrendingEditionWithGrok(): Promise<TeletextEdition> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("XAI_API_KEY is not configured");

  const model = process.env.XAI_MODEL || "grok-4.6";
  const useWebSearch = (process.env.XAI_WEB_SEARCH || "true").toLowerCase() !== "false";
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const prompt = `
You are the editor of a live, worldwide Teletext news service.

Use X Search to determine what is genuinely trending and being discussed on X right now, worldwide. Treat X as the live signal layer, not as a truth source. Look for conversations with broad or rapidly rising attention across distinct accounts, not merely one viral post.

Create 6-10 stories that best explain what matters in the current X conversation. The edition should feel like a human editor condensed the chaos of X into a finite news bulletin.

Editorial rules:
- Discover stories from current X activity. Do not rely on stale model knowledge.
- Popularity is not truth. Never turn an unsupported X allegation into a factual claim.
- Merge duplicate trends that refer to the same underlying event.
- Exclude spam, engagement bait, fandom-only noise and context-free memes unless they correspond to genuinely important news.
- Prefer concrete new developments over generic discourse.
- When a consequential factual claim is involved, use Web Search to verify it against primary sources or reputable reporting before stating it as fact.
- If a claim remains uncertain, explicitly attribute it to X discussion or call it unconfirmed.
- Rank the output from most important to least important.
- Keep each headline under about 55 characters.
- Each story should have 2-4 compact paragraphs suitable for a roughly 40-column Teletext display.
- Use highlightParagraph for the single paragraph that most deserves yellow emphasis, or null.
- "trend" should be the short X topic/phrase that led to the story.
- "sources" must contain real URLs you actually relied on, including X URLs when useful.
- Avoid hype, clickbait and editorializing.
- Do not write an introduction. Return only the requested structured edition.

Current UTC time: ${now.toISOString()}
`;

  const tools: any[] = [
    {
      type: "x_search",
      from_date: isoDate(yesterday),
      to_date: isoDate(now)
    }
  ];
  if (useWebSearch) tools.push({ type: "web_search" });

  const body = {
    model,
    input: prompt,
    tools,
    store: false,
    text: {
      format: {
        type: "json_schema",
        name: "teletext_edition",
        strict: true,
        schema
      }
    }
  };

  const response = await fetch("https://api.x.ai/v1/responses", {
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
    throw new Error(`xAI Grok editor failed (${response.status}): ${error.slice(0, 600)}`);
  }

  const raw = await response.json();
  const parsed = JSON.parse(outputText(raw)) as { stories: EditedStory[] };

  const stories: TeletextStory[] = parsed.stories.map((story, index) => ({
    ...story,
    page: 101 + index,
    sourcePosts: story.sources
      .filter((source) => source.url.includes("x.com/"))
      .slice(0, 3)
      .map((source, sourceIndex) => ({
        id: `${101 + index}-${sourceIndex}`,
        text: source.label,
        url: source.url
      }))
  }));

  return {
    updatedAt: new Date().toISOString(),
    mode: "live",
    basis: "Current worldwide X conversation, discovered with Grok 4.6 X Search and web-checked where needed.",
    trends: parsed.stories.map((story) => story.trend),
    stories
  };
}
