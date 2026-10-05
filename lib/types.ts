export type TeletextSource = {
  label: string;
  url?: string;
};

export type TeletextStory = {
  page: number;
  category: string;
  headline: string;
  paragraphs: string[];
  highlightParagraph?: number | null;
  trend?: string;
  sourcePosts?: Array<{
    id: string;
    username?: string;
    text: string;
    url?: string;
  }>;
  sources: TeletextSource[];
};

export type TeletextEdition = {
  updatedAt: string;
  mode: "live" | "demo" | "error";
  basis: string;
  trends: string[];
  stories: TeletextStory[];
  language: string;
  query?: string;
};
