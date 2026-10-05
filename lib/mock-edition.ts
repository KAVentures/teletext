import type { TeletextEdition } from "./types";

export const mockEdition: TeletextEdition = {
  updatedAt: new Date().toISOString(),
  mode: "demo",
  language: "en",
  basis: "Demo edition — add X_BEARER_TOKEN and XAI_API_KEY in Vercel to go live.",
  trends: ["World", "Technology", "Markets", "Science", "Culture", "Sport"],
  stories: [
    {
      page: 101,
      category: "WORLD",
      headline: "This is the Teletext front page",
      paragraphs: [
        "The interface is deliberately constrained: one story, one page, short paragraphs and no infinite feed.",
        "When live credentials are added, the editor will use what is trending on X as the discovery signal and compress the important stories into this format.",
        "Grok 4.7 can check major claims against the open web before publication."
      ],
      highlightParagraph: 1,
      sources: [{ label: "Demo page" }]
    },
    {
      page: 102,
      category: "TECH",
      headline: "X trends become the tip desk",
      paragraphs: [
        "The system first reads the current X trend list rather than trying to invent topics itself.",
        "A small sample of recent posts gives the AI enough context to understand why each topic is trending.",
        "The editor then removes noise, duplicates and fandom-only trends unless they are genuinely newsworthy."
      ],
      highlightParagraph: 0,
      sources: [{ label: "Architecture preview" }]
    },
    {
      page: 103,
      category: "NEWS",
      headline: "No account or database required",
      paragraphs: [
        "The first version is intentionally simple. There are no user accounts, likes, comments or personalization.",
        "The generated edition is cached for fifteen minutes. The first visitor after expiry triggers the next update.",
        "A real database can be added later when personalized and shareable editions need durable history."
      ],
      highlightParagraph: 1,
      sources: [{ label: "Architecture preview" }]
    },
    {
      page: 104,
      category: "DESIGN",
      headline: "Built to feel like real Text-TV",
      paragraphs: [
        "Black background, pixel type, bright semantic colours and direct page numbers are the interface.",
        "Tap a page number, swipe, use the arrow keys or type a page number directly.",
        "The Web view keeps the same story but renders it as ordinary accessible text."
      ],
      highlightParagraph: 0,
      sources: [{ label: "UI preview" }]
    },
    {
      page: 105,
      category: "EDITOR",
      headline: "Popularity is not the same as importance",
      paragraphs: [
        "X determines what is attracting attention. The AI editor still decides whether a trend deserves a news page.",
        "Unverified claims should not be rewritten as fact. Ambiguous stories stay explicitly attributed until corroborated.",
        "This keeps X as the live signal layer rather than the truth layer."
      ],
      highlightParagraph: 1,
      sources: [{ label: "Editorial policy preview" }]
    },
    {
      page: 106,
      category: "NEXT",
      headline: "Add credentials to switch on live mode",
      paragraphs: [
        "Set XAI_API_KEY in the Vercel project settings. Grok then searches X directly.",
        "The default edition asks Grok 4.7 to identify the current worldwide X conversation in real time.",
        "No secrets are exposed to the browser."
      ],
      highlightParagraph: 0,
      sources: [{ label: "Setup preview" }]
    }
  ]
};
