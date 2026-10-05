import { unstable_cache } from "next/cache";
import { mockEdition } from "./mock-edition";
import { buildTrendingEditionWithGrok } from "./editor";
import type { TeletextEdition } from "./types";

async function buildEdition(): Promise<TeletextEdition> {
  if (!process.env.XAI_API_KEY) {
    return { ...mockEdition, updatedAt: new Date().toISOString() };
  }

  try {
    return await buildTrendingEditionWithGrok();
  } catch (error) {
    console.error("Live edition generation failed", error);
    return {
      ...mockEdition,
      updatedAt: new Date().toISOString(),
      basis: "Live update failed; showing the safe demo edition. Check server logs and xAI API access."
    };
  }
}

export const getEdition = unstable_cache(buildEdition, ["teletext-live-edition-v3"], {
  revalidate: 900,
  tags: ["teletext-edition"]
});
