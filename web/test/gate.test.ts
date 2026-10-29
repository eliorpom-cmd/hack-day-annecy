import { test } from "node:test";
import assert from "node:assert/strict";
import { gateOpen, gateToken, isGated, passwordMatches, safeNext } from "../src/lib/gate.ts";

test("dangerous paths are gated, public ones and webhooks are not", () => {
  for (const p of ["/app", "/app/reglages", "/onboarding", "/login", "/auth/verify", "/api/auth/demo", "/api/auth/try",
    "/api/auth/magic", "/api/numbers", "/api/voices/clone", "/api/agent", "/api/me"]) {
    assert.equal(isGated(p), true, p);
  }
  for (const p of ["/", "/acces", "/a/abc123", "/a/abc/recall", "/site/plomberie", "/plomberie-martin/",
    "/api/twilio/voice", "/api/elevenlabs/post-call", "/api/whatsapp-relay/outbox", "/application"]) {
    assert.equal(isGated(p), false, p);
  }
});

test("gate opens only with the cookie derived from the configured password", async () => {
  const good = await gateToken("secret");
  assert.equal(await gateOpen(good, "secret"), true);
  assert.equal(await gateOpen(good, "other"), false);
  assert.equal(await gateOpen(undefined, "secret"), false);
  assert.equal(await gateOpen(good, undefined), false);
  assert.equal(await gateOpen("", ""), false);
});

test("password check fails closed", async () => {
  assert.equal(await passwordMatches("secret", "secret"), true);
  assert.equal(await passwordMatches("Secret", "secret"), false);
  assert.equal(await passwordMatches("", "secret"), false);
  assert.equal(await passwordMatches("x", undefined), false);
});

test("next only accepts same-site paths", () => {
  assert.equal(safeNext("/app/reglages"), "/app/reglages");
  assert.equal(safeNext("https://evil.com"), "/app");
  assert.equal(safeNext("//evil.com"), "/app");
  assert.equal(safeNext("/\\evil.com"), "/app");
  assert.equal(safeNext(null), "/app");
});
