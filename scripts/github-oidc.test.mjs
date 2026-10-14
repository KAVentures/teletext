import test from "node:test";
import assert from "node:assert/strict";
import { validPublisherClaims, verifyDailyPublisherToken, DAILY_AUDIENCE } from "../lib/github-oidc.ts";

const now = 1791950000;
const good = {
  iss: "https://token.actions.githubusercontent.com",
  aud: DAILY_AUDIENCE,
  repository: "KAVentures/teletext",
  repository_id: "1404794352",
  repository_owner_id: "134240819",
  ref: "refs/heads/main",
  sub: "repo:KAVentures/teletext:ref:refs/heads/main",
  workflow_ref: "KAVentures/teletext/.github/workflows/daily-edition.yml@refs/heads/main",
  event_name: "schedule",
  exp: now + 300,
  iat: now - 1,
  nbf: now - 1
};

test("only the exact scheduled main-branch workflow is permitted", () => {
  assert.equal(validPublisherClaims(good, now), true);
  for (const [key,value] of [
    ["ref", "refs/heads/dev"], ["repository_id", "123"],
    ["workflow_ref", "KAVentures/teletext/.github/workflows/other.yml@refs/heads/main"],
    ["aud", "wrong"], ["event_name", "push"], ["exp", now - 1]
  ]) {
    assert.equal(validPublisherClaims({ ...good, [key]: value }, now), false, key);
  }
});

test("unsigned and random caller tokens are always rejected", async () => {
  assert.equal(await verifyDailyPublisherToken("not-a-jwt"), false);
  const encoded = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const forged = [encoded({ alg: "none", kid: "any" }), encoded(good), "fake"].join(".");
  assert.equal(await verifyDailyPublisherToken(forged), false);
});
