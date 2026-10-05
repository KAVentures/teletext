import { checkRateLimit } from "@vercel/firewall";

async function checkBudget(rateLimitId: string) {
  if (process.env.NODE_ENV !== "production") return;

  const result = await checkRateLimit(rateLimitId, {
    rateLimitKey: "global"
  });

  // Fail closed in production if the guard is missing or blocked. This is
  // intentional: protecting spend is more important than silently bypassing it.
  if (result.error === "not-found") {
    throw new Error(`Budget guard "${rateLimitId}" is not configured`);
  }

  if (result.rateLimited) {
    throw new Error("Daily search budget protection is active. Please try again later.");
  }
}

export async function assertGlobalGenerationBudget() {
  return checkBudget("teletext-global-generation");
}

export async function assertTopicGenerationBudget() {
  return checkBudget("teletext-topic-generation");
}
