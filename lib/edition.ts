import { unstable_cache } from "next/cache";
import { mockEdition } from "./mock-edition";
import { fetchXSignals } from "./x";
import { editSignalsIntoEdition } from "./editor";
import type { TeletextEdition } from "./types";

async function buildEdition(): Promise<TeletextEdition> {
  if (!process.env.X_BEARER_TOKEN || !process.env.XAI_API_KEY) {
    return { ...mockEdition, updatedAt: new Date().toISOString() };
  }

  try {
    const signals = await fetchXSignals();
    return await editSignalsIntoEdition(signals);
  } catch (error) {
    console.error("Live edition generation failed", error);
    return {
      ...mockEdition,
      updatedAt: new Date().toISOString(),
      basis: "Live update failed; showing the safe demo edition. Check server logs and API access."
    };
  }
}

export const getEdition = unstable_cache(buildEdition, ["teletext-live-edition-v2"], {
  revalidate: 900,
  tags: ["teletext-edition"]
});
