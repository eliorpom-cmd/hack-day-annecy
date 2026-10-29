import { test } from "node:test";
import assert from "node:assert/strict";
import { isFinalAgentName } from "../src/lib/demo-setup.ts";

test("demo agent: found by its name on ElevenLabs", () => {
  assert.ok(isFinalAgentName("Assistant Plomberie Martin FINAL"));
  assert.ok(isFinalAgentName("assistant – plomberie martin (final)"));
  assert.ok(!isFinalAgentName("Assistant – Plomberie Martin"));
  assert.ok(!isFinalAgentName("Final test"));
});
