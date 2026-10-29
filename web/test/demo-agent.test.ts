import { test } from "node:test";
import assert from "node:assert/strict";
import { isFinalAgentName } from "../src/lib/demo-setup.ts";

test("demo agent: found by its name on ElevenLabs", () => {
  assert.ok(isFinalAgentName("Assistant Plomberie Martin FINAL"));
  assert.ok(isFinalAgentName("assistant – plomberie martin (final)"));
  assert.ok(!isFinalAgentName("Assistant – Plomberie Martin"));
  assert.ok(!isFinalAgentName("Final test"));
});

test("FINAL agent checks: audio, fields, variables, end_call", async () => {
  const { checkFinalAgent } = await import("../src/lib/demo-setup.ts");
  const good = {
    conversation_config: {
      asr: { user_input_audio_format: "ulaw_8000" }, tts: { agent_output_audio_format: "ulaw_8000" },
      agent: { prompt: { prompt: "{{slot_1}} {{slot_2}} {{caller_phone}}", built_in_tools: { end_call: { name: "end_call" } } } },
    },
    platform_settings: { data_collection: Object.fromEntries(["name", "phone", "address", "subject", "need", "urgency", "appointment", "urgency_reason"].map((k) => [k, {}])) },
  };
  assert.ok(checkFinalAgent(good).every((c) => c.ok));
  const bad = checkFinalAgent({ conversation_config: { asr: { user_input_audio_format: "pcm_16000" } } });
  assert.ok(bad.every((c) => !c.ok));
  assert.match(bad[1]!.detail, /appointment/);
});
