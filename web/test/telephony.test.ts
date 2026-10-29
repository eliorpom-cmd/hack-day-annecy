import { test } from "node:test";
import assert from "node:assert/strict";
import { isWithinHours, localParts } from "../src/lib/telephony/hours.ts";
import { artisanMissed, dialArtisan, sayAndHangup } from "../src/lib/telephony/twiml.ts";
import { checkToken, signElevenLabsPayload, verifyElevenLabsSignature } from "../src/lib/telephony/signature.ts";
import { buildUrgentSms, normalizeUrgency, parsePostCall, SMS_MAX } from "../src/lib/telephony/postcall.ts";
import { DATA_COLLECTION, postCallWebhookUrl } from "../src/lib/telephony/agent-config.ts";

const week = [0, 1, 2, 3].map((weekday) => ({ weekday, opens: "08:00", closes: "18:00" }))
  .concat([{ weekday: 4, opens: "08:00", closes: "12:00" }, { weekday: 4, opens: "14:00", closes: "17:00" }]);

test("weekday 0 is Monday, in Paris time", () => {
  // 2026-10-26 is a Monday; 23:30 UTC on Sunday is already Monday 00:30 in Paris (UTC+1)
  assert.deepEqual(localParts(new Date("2026-10-25T23:30:00Z")), { weekday: 0, minutes: 30 });
  assert.equal(localParts(new Date("2026-11-01T12:00:00Z")).weekday, 6);
});

test("isWithinHours uses Paris time across DST", () => {
  // Summer (UTC+2): 06:30 UTC = 08:30 Paris, Wednesday 2026-07-01
  assert.ok(isWithinHours(week, new Date("2026-07-01T06:30:00Z")));
  assert.ok(!isWithinHours(week, new Date("2026-07-01T05:30:00Z")));
  // Winter (UTC+1): 17:30 UTC = 18:30 Paris, closed; 16:59 UTC = 17:59 open
  assert.ok(!isWithinHours(week, new Date("2026-11-04T17:30:00Z")));
  assert.ok(isWithinHours(week, new Date("2026-11-04T16:59:00Z")));
});

test("isWithinHours handles split days, weekends and closing bound", () => {
  assert.ok(!isWithinHours(week, new Date("2026-10-30T12:30:00Z"))); // Friday 13:30 lunch break
  assert.ok(isWithinHours(week, new Date("2026-10-30T13:30:00Z")));  // Friday 14:30
  assert.ok(!isWithinHours(week, new Date("2026-10-31T09:00:00Z"))); // Saturday
  assert.ok(!isWithinHours(week, new Date("2026-11-02T17:00:00Z"))); // Monday 18:00 exactly
  assert.ok(!isWithinHours([], new Date()));
  assert.ok(!isWithinHours([{ weekday: 0, opens: "bad", closes: "18:00" }], new Date("2026-10-26T09:00:00Z")));
  assert.ok(isWithinHours(week, new Date("2026-10-26T08:00:00Z"), "UTC"));
});

test("TwiML builders", () => {
  const xml = dialArtisan("+33612345678", 15, "/api/twilio/fallback?token=a&call=b");
  assert.match(xml, /<Dial timeout="15" action="\/api\/twilio\/fallback\?token=a&amp;call=b" method="POST" answerOnBridge="true"><Number>\+33612345678<\/Number><\/Dial>/);
  assert.match(dialArtisan("+33", 999, "/x"), /timeout="60"/);
  assert.match(sayAndHangup(), /<Say language="fr-FR">Désolé.*<\/Say><Hangup\/>/);
  assert.ok(artisanMissed("busy") && artisanMissed("no-answer") && !artisanMissed("completed"));
});

test("token check", () => {
  assert.ok(checkToken("secret", "secret"));
  assert.ok(!checkToken("secreT", "secret"));
  assert.ok(!checkToken("secret-longer", "secret"));
  assert.ok(!checkToken("x", undefined));
  assert.ok(!checkToken(null, "secret"));
});

test("ElevenLabs signature", async () => {
  const body = '{"type":"post_call_transcription"}';
  const now = 1_800_000_000;
  const header = await signElevenLabsPayload(body, "whsec", now);
  assert.ok(await verifyElevenLabsSignature(header, body, "whsec", now + 60));
  assert.ok(!(await verifyElevenLabsSignature(header, body + " ", "whsec", now)));
  assert.ok(!(await verifyElevenLabsSignature(header, body, "other", now)));
  assert.ok(!(await verifyElevenLabsSignature(header, body, "whsec", now + 31 * 60)));
  assert.ok(!(await verifyElevenLabsSignature(header, body, undefined, now)));
  assert.ok(!(await verifyElevenLabsSignature("garbage", body, "whsec", now)));
});

const sample = {
  type: "post_call_transcription",
  data: {
    agent_id: "agent_1", conversation_id: "conv_1",
    transcript: [{ role: "agent", message: "Bonjour", time_in_call_secs: 0 }, { role: "user", message: "J'ai une fuite", time_in_call_secs: 3 }, { role: "user", message: null }],
    metadata: { call_duration_secs: 74.6, phone_call: { external_number: "+33611111111", call_sid: "CA123" } },
    analysis: {
      transcript_summary: "Fuite sous l'évier.",
      data_collection_results: {
        name: { value: "Jean Dupont" }, address: { value: "3 rue du Lac, Annecy" },
        need: { value: "Fuite d'eau sous l'évier" }, urgency: { value: "Urgence" }, phone: { value: null },
      },
    },
  },
};

test("parsePostCall extracts call and lead", () => {
  const p = parsePostCall(sample)!;
  assert.equal(p.agentId, "agent_1");
  assert.equal(p.durationS, 75);
  assert.equal(p.callSid, "CA123");
  assert.equal(p.transcript.length, 2);
  assert.deepEqual(p.lead, { name: "Jean Dupont", phone: "+33611111111", address: "3 rue du Lac, Annecy", need: "Fuite d'eau sous l'évier", urgency: "urgence" });
  assert.equal(parsePostCall({ type: "post_call_audio", data: {} }), null);
  assert.equal(parsePostCall({ type: "post_call_transcription", data: {} }), null);
});

test("urgency normalisation", () => {
  assert.equal(normalizeUrgency("URGENT"), "urgent");
  assert.equal(normalizeUrgency("bof"), "normal");
  assert.equal(normalizeUrgency(undefined), "normal");
});

test("urgent SMS is short French text", () => {
  assert.equal(buildUrgentSms({ name: "Jean Dupont", phone: "+33611111111", need: "Fuite d'eau." }),
    "URGENCE – Jean Dupont (+33611111111) : Fuite d'eau. Rappelez vite.");
  const long = buildUrgentSms({ name: "A", phone: "+33", need: "x".repeat(1000) });
  assert.ok(long.length <= SMS_MAX && long.endsWith("Rappelez vite."));
  assert.ok(buildUrgentSms({ name: "N".repeat(400), phone: null, need: null }).length <= SMS_MAX);
  assert.match(buildUrgentSms({ name: null, phone: null, need: null }), /^URGENCE – Client \(numéro inconnu\)/);
});

test("agent config", () => {
  assert.deepEqual(Object.keys(DATA_COLLECTION), ["name", "phone", "address", "need", "urgency"]);
  assert.deepEqual(DATA_COLLECTION.urgency.enum, ["urgence", "urgent", "normal"]);
  assert.equal(postCallWebhookUrl("https://x.dev/"), "https://x.dev/api/elevenlabs/post-call");
});
