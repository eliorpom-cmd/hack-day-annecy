import { test } from "node:test";
import assert from "node:assert/strict";
import { hashToken, isValidEmail, newToken } from "../src/lib/tokens.ts";

test("tokens are random and URL-safe", () => {
  const a = newToken(), b = newToken();
  assert.notEqual(a, b);
  assert.match(a, /^[A-Za-z0-9_-]{40,}$/);
});

test("hash is stable and hides the token", async () => {
  assert.equal(await hashToken("abc"), await hashToken("abc"));
  assert.equal((await hashToken("abc")).length, 64);
  assert.notEqual(await hashToken("abc"), "abc");
});

test("email check", () => {
  assert.ok(isValidEmail("artisan@exemple.fr"));
  assert.ok(!isValidEmail("pas un mail"));
});
