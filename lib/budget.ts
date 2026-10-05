import { checkRateLimit } from "@vercel/firewall";

async function checkBudget(rateLimitId: string) {
  if (process.env.NODE_ENV !== "production") return;

  try {
    const result = await checkRateLimit(rateLimitId, {
      rateLimitKey: "global"
    });

    if (result.error === "not-found") {
      // The code remains safe to deploy before the Vercel Firewall rule is
      // provisioned. Long-lived caches + hard xAI tool-turn limits still apply.
      console.warn(`Budget guard "${rateLimitId}" is not configured in Vercel Firewall`);
      return;
    }

    if (result.rateLimited) {
      throw new Error("Daily search budget protection is active. Please try again later.");
    }
  } catch (error) {
    if (error instanceof Error && /budget protection/i.test(error.message)) throw error;
    // A firewall lookup failure must not take the entire news site down.
    console.warn("Budget guard lookup failed; relying on cache/tool caps", error);
  }
}

export async function assertGlobalGenerationBudget() {
  return checkBudget("teletext-global-generation");
}

export async function assertTopicGenerationBudget() {
  return checkBudget("teletext-topic-generation");
}
