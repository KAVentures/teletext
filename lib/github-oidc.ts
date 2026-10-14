import { createPublicKey, verify as verifySignature } from "node:crypto";

export const DAILY_AUDIENCE = "https://x.kinvectum.com/api/internal/daily-edition";
const ISSUER = "https://token.actions.githubusercontent.com";
const WORKFLOW_REF = "KAVentures/teletext/.github/workflows/daily-edition.yml@refs/heads/main";
const REPO_ID = "1404794352";
const OWNER_ID = "134240819";
const jwksUrl = "https://token.actions.githubusercontent.com/.well-known/jwks";

function decodePart(part: string): Record<string, any> {
  const data = Buffer.from(part, "base64url");
  if (data.byteLength > 9000) throw new Error("Oversized JWT part");
  const decoded = JSON.parse(data.toString("utf8"));
  if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) throw new Error("Malformed JWT");
  return decoded;
}

export function validPublisherClaims(payload: Record<string, any>, nowSeconds = Math.floor(Date.now() / 1000)) {
  return payload.iss === ISSUER &&
    payload.aud === DAILY_AUDIENCE &&
    payload.repository === "KAVentures/teletext" &&
    String(payload.repository_id) === REPO_ID &&
    String(payload.repository_owner_id) === OWNER_ID &&
    payload.ref === "refs/heads/main" &&
    payload.sub === "repo:KAVentures@134240819/teletext@1404794352:ref:refs/heads/main" &&
    payload.workflow_ref === WORKFLOW_REF &&
    ["push", "schedule", "workflow_dispatch"].includes(payload.event_name) &&
    typeof payload.exp === "number" &&
    typeof payload.iat === "number" &&
    payload.exp > nowSeconds &&
    payload.exp <= nowSeconds + 600 &&
    payload.iat <= nowSeconds + 30 &&
    payload.iat > nowSeconds - 600 &&
    (typeof payload.nbf !== "number" || payload.nbf <= nowSeconds + 30);
}

export async function verifyDailyPublisherToken(token: string): Promise<boolean> {
  try {
    if (token.length > 12000 || !/^[A-Za-z0-9_\-.]+$/.test(token)) return false;
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const header = decodePart(parts[0]);
    if (header.alg !== "RS256" || typeof header.kid !== "string") return false;
    const payload = decodePart(parts[1]);
    if (!validPublisherClaims(payload)) return false;

    // GitHub publishes signing keys via this HTTPS endpoint. Only a verified
    // RSA signature, not claims alone, authorizes the paid API request.
    const response = await fetch(jwksUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) return false;
    const jwks = (await response.json()) as { keys?: Array<Record<string, any>> };
    const jwk = jwks.keys?.find((key) =>
      key.kid === header.kid && key.kty === "RSA" &&
      (!key.alg || key.alg === "RS256") &&
      (!key.use || key.use === "sig")
    );
    if (!jwk) return false;
    const publicKey = createPublicKey({ key: jwk, format: "jwk" });
    return verifySignature(
      "RSA-SHA256",
      Buffer.from(parts[0] + "." + parts[1], "ascii"),
      publicKey,
      Buffer.from(parts[2], "base64url")
    );
  } catch {
    return false;
  }
}
