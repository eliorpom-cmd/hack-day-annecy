import { test } from "node:test";
import assert from "node:assert/strict";
import { isWithinHours, localParts } from "../src/lib/telephony/hours.ts";
import { isForwardedCall, shouldRingArtisan } from "../src/lib/telephony/routing.ts";
import { artisanMissed, dialArtisan, sayAndHangup } from "../src/lib/telephony/twiml.ts";
import { checkToken, signElevenLabsPayload, verifyElevenLabsSignature } from "../src/lib/telephony/signature.ts";
import { buildCallMessage, formatFrPhone, MESSAGE_MAX, normalizeUrgency, parsePostCall } from "../src/lib/telephony/postcall.ts";
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
        urgency_reason: { value: "Fuite en cours, risque de dégât." },
      },
    },
  },
};

test("the slot picked during the call becomes the appointment, and goes into the message", () => {
  const booked = structuredClone(sample) as typeof sample & { data: Record<string, unknown> };
  (booked.data.analysis.data_collection_results as Record<string, unknown>).appointment = { value: "creneau_2" };
  booked.data.conversation_initiation_client_data = { dynamic_variables: {
    slot_1: "aujourd’hui à 15 h", slot_1_iso: "2026-10-29T14:00:00.000Z", slot_2: "demain à 9 h", slot_2_iso: "2026-10-30T08:00:00.000Z",
  } };
  const p = parsePostCall(booked)!;
  assert.deepEqual(p.lead.appointment, { iso: "2026-10-30T08:00:00.000Z", label: "demain à 9 h" });
  const msg = buildCallMessage({ ...p.lead, appointment: p.lead.appointment!.label, summary: p.summary });
  assert.match(msg, /\nRendez-vous : demain à 9 h, dans votre agenda\n/);
});

test("parsePostCall extracts call and lead", () => {
  const p = parsePostCall(sample)!;
  assert.equal(p.agentId, "agent_1");
  assert.equal(p.durationS, 75);
  assert.equal(p.callSid, "CA123");
  assert.equal(p.transcript.length, 2);
  assert.deepEqual(p.lead, {
    name: "Jean Dupont", phone: "+33611111111", address: "3 rue du Lac, Annecy", need: "Fuite d'eau sous l'évier",
    urgency: "urgence", urgencyReason: "Fuite en cours, risque de dégât.", subject: null, appointment: null,
  });
  assert.equal(parsePostCall({ type: "post_call_audio", data: {} }), null);
  assert.equal(parsePostCall({ type: "post_call_transcription", data: {} }), null);
});

test("urgency normalisation", () => {
  assert.equal(normalizeUrgency("URGENT"), "urgent");
  assert.equal(normalizeUrgency("bof"), "normal");
  assert.equal(normalizeUrgency(undefined), "normal");
});

test("parsePostCall reads urgency_reason and treats empty values as null", () => {
  assert.equal(parsePostCall(sample)!.lead.urgencyReason, "Fuite en cours, risque de dégât.");
  const noReason = structuredClone(sample);
  noReason.data.analysis.data_collection_results.urgency_reason = { value: "" };
  assert.equal(parsePostCall(noReason)!.lead.urgencyReason, null);
  const missing = structuredClone(sample);
  delete (missing.data.analysis.data_collection_results as Record<string, unknown>).urgency_reason;
  assert.equal(parsePostCall(missing)!.lead.urgencyReason, null);
});

const base = { urgencyReason: null, subject: "fuite d'eau", name: "Jean Dupont", phone: "+33611111111", address: null, need: "Réparer la fuite sous l'évier.", summary: null };

test("call message: urgence follows COPY.md", () => {
  assert.equal(
    buildCallMessage({ ...base, urgency: "urgence", urgencyReason: "L'eau coule dans le salon.", address: "12 rue Royale, Annecy", link: "https://x.fr/a/abc" }),
    "🔴 Urgence : fuite d'eau, Jean Dupont\nPourquoi : L'eau coule dans le salon.\nDemande : Réparer la fuite sous l'évier.\n12 rue Royale, Annecy\nRappeler : 06 11 11 11 11\nDétails : https://x.fr/a/abc",
  );
});

test("call message: prioritaire", () => {
  const msg = buildCallMessage({ ...base, urgency: "urgent", urgencyReason: "Plus d'eau chaude." });
  assert.equal(msg.split("\n")[0], "🟠 Prioritaire : fuite d'eau, Jean Dupont");
  assert.ok(msg.includes("Pourquoi : Plus d'eau chaude."));
});

test("call message: normal has no reason line", () => {
  const msg = buildCallMessage({ ...base, urgency: "normal", urgencyReason: "rien" });
  assert.equal(msg, "🟢 Normal : fuite d'eau, Jean Dupont\nDemande : Réparer la fuite sous l'évier.\nRappeler : 06 11 11 11 11");
});

test("call message: missing fields fall back", () => {
  const msg = buildCallMessage({ urgency: "normal", urgencyReason: null, name: null, phone: null, address: null, need: null, summary: "Question sur les tarifs." });
  assert.equal(msg, "🟢 Normal : Question sur les tarifs., un client\nDemande : Question sur les tarifs.\nRappeler : numéro inconnu");
  assert.ok(!msg.includes("–") && !msg.includes("—"));
});

test("call message: length cap holds with long fields", () => {
  const long = buildCallMessage({
    urgency: "urgence", urgencyReason: "r".repeat(2000), subject: "s".repeat(500), name: "N".repeat(900), phone: "+".repeat(500),
    address: "a".repeat(900), need: "x".repeat(2000), summary: "s".repeat(2000), link: "https://x.fr/a/abc",
  });
  assert.ok(long.length <= MESSAGE_MAX, `length ${long.length}`);
});

test("phone format", () => {
  assert.equal(formatFrPhone("+33639980101"), "06 39 98 01 01");
  assert.equal(formatFrPhone("+14155550100"), "+14155550100");
});

test("agent config", () => {
  assert.deepEqual(Object.keys(DATA_COLLECTION), ["name", "phone", "address", "subject", "need", "urgency", "appointment", "urgency_reason"]);
  assert.deepEqual(DATA_COLLECTION.appointment.enum, ["creneau_1", "creneau_2", "aucun"]);
  assert.deepEqual(DATA_COLLECTION.urgency.enum, ["urgence", "urgent", "normal"]);
  assert.equal(postCallWebhookUrl("https://x.dev/"), "https://x.dev/api/elevenlabs/post-call");
});

test("routing: ring the artisan during his hours, at any time without fixed hours, never on a forwarded call", () => {
  const base = { artisanPhone: "+33612345678", hours: week, forwardingMode: null, forwarded: false } as const;
  const friday1430 = new Date("2026-10-30T13:30:00Z");
  const saturday = new Date("2026-10-31T09:00:00Z");
  assert.ok(shouldRingArtisan({ ...base, now: friday1430 }));
  assert.ok(!shouldRingArtisan({ ...base, now: saturday }));
  // « Pas d'horaires fixes »: no rows, his phone rings first at any time
  assert.ok(shouldRingArtisan({ ...base, hours: [], now: saturday }));
  assert.ok(shouldRingArtisan({ ...base, hours: [], now: new Date("2026-11-01T02:00:00Z") }));
  // No phone: always the agent
  assert.ok(!shouldRingArtisan({ ...base, artisanPhone: null, hours: [], now: friday1430 }));
  // He keeps his number: calls arrive forwarded, his phone already rang
  assert.ok(!shouldRingArtisan({ ...base, forwardingMode: "renvoi", now: friday1430 }));
  assert.ok(!shouldRingArtisan({ ...base, forwardingMode: "renvoi", hours: [], now: friday1430 }));
  assert.ok(!shouldRingArtisan({ ...base, forwarded: true, now: friday1430 }));
  assert.ok(shouldRingArtisan({ ...base, forwardingMode: "numero", now: friday1430 }));
});

test("forwarded call detected from Twilio's ForwardedFrom or a Diversion header", () => {
  const form = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });
  assert.ok(isForwardedCall(form({ ForwardedFrom: "+33612345678" })));
  assert.ok(isForwardedCall(form({ SipHeader_Diversion: "<sip:+33612345678@x>;reason=no-answer" })));
  assert.ok(!isForwardedCall(form({ From: "+33611111111" })));
  assert.ok(!isForwardedCall(form({ ForwardedFrom: " " })));
});
