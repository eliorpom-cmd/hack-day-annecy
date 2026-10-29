import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAgentPayload, buildSystemPrompt, firstMessage, formatHoursFr, isPriceRange } from "../src/lib/prompt.ts";
import { DEMO_VOICES, toVoices } from "../src/lib/voices.ts";
import { parseAvailable, parseCountry, parseIncoming, twilioErrorHint } from "../src/lib/numbers.ts";

const biz = { name: "Plomberie Dupont", trade: "plombier", city: "Annecy", description: "Dépannage 7j/7.", greeting: "" };

test("first message: saved greeting as is, else the gendered default with the first name", () => {
  assert.equal(firstMessage(biz), "Bonjour, ici l’assistant de Plomberie Dupont. L’artisan est sur un chantier, que puis-je faire pour vous\u00a0?");
  assert.equal(firstMessage({ ...biz, first_name: "Marc", voice_gender: "female" }), "Bonjour, ici l’assistante de Plomberie Dupont. Marc est sur un chantier, que puis-je faire pour vous\u00a0?");
  // A generated greeting, older wording included, is rebuilt: the répondeur introduces itself as the assistant
  assert.equal(firstMessage({ ...biz, greeting: "Oui allô, Plomberie Dupont." }), firstMessage(biz));
  assert.equal(firstMessage({ ...biz, greeting: "Bonjour, ici Dupont" }), "Bonjour, ici Dupont");
});

test("prompt uses the first name for the callback and keeps the rules", () => {
  const p = buildSystemPrompt({ ...biz, first_name: "Marc", voice_gender: "female" }, [], []);
  assert.match(p, /Vous êtes l'assistante de Marc, de Plomberie Dupont/);
  assert.match(p, /« Marc vous donnera le prix »/);
  assert.match(p, /Pas d.horaires fixes : Marc s.organise/);
  assert.match(p, /ne dites jamais où il en est/);
  assert.match(p, /Ne redites jamais bonjour/);
  assert.match(p, /Ne lui demandez pas son numéro/);
  assert.match(p, /\{\{caller_phone\}\}/);
  assert.match(p, /répondez-y d'abord avec la documentation/);
});

test("hours in French, closed days included", () => {
  const s = formatHoursFr([{ weekday: 0, opens: "08:00", closes: "12:30" }, { weekday: 0, opens: "14:00", closes: "18:00" }]);
  assert.match(s, /lundi : 8 h – 12 h 30, 14 h – 18 h/);
  assert.match(s, /dimanche : fermé/);
});

test("price ranges are detected", () => {
  assert.ok(isPriceRange("Entre 90 et 150 € TTC"));
  assert.ok(isPriceRange("De 900 à 1 800 euros"));
  assert.ok(isPriceRange("90-150 €"));
  assert.ok(!isPriceRange("49 € TTC"));
});

test("prompt carries business facts and the price rule", () => {
  const p = buildSystemPrompt(biz, [], [
    { question: "Déplacement ?", answer: "49 € TTC", kind: "price" },
    { question: "Débouchage ?", answer: "Entre 90 et 150 €", kind: "price" },
    { question: "Devis gratuit ?", answer: "Oui", kind: "info" },
  ]);
  assert.match(p, /assistant de Plomberie Dupont, plombier à Annecy/);
  assert.match(p, /- Déplacement \? : 49 € TTC\n/);
  assert.match(p, /Débouchage \? : Entre 90 et 150 € \(fourchette : ajoutez « le prix exact se fait sur devis »\)/);
  assert.match(p, /- Devis gratuit \?\n  Oui/);
  assert.match(p, /Jamais d'estimation ni de prix inventé/);
  assert.match(p, /« L'artisan vous donnera le prix »/);
  assert.match(p, /Urgence \(fuite importante/);
  assert.doesNotMatch(p, /\n{3,}/);
  const none = buildSystemPrompt({ ...biz, city: "" }, [], []);
  assert.match(none, /Aucun tarif renseigné/);
  assert.match(none, /Pas d'horaires fixes/);
});

test("calendar connected: the two free slots, else never an appointment", () => {
  const withCal = buildSystemPrompt({ ...biz, first_name: "Marc" }, [], [], { calendar: true });
  assert.match(withCal, /créneau 1 : \{\{slot_1\}\}/);
  assert.match(withCal, /Sinon, Marc peut passer \{\{slot_2\}\}/);
  assert.match(withCal, /c'est dans l'agenda de Marc/);
  assert.match(withCal, /ne dites jamais « je relis »/);
  const without = buildSystemPrompt({ ...biz, first_name: "Marc" }, [], []);
  assert.doesNotMatch(without, /\{\{slot_1\}\}/);
  assert.match(without, /ne proposez jamais de date ni d'heure de rendez-vous/);
  assert.match(without, /Quelles sont vos disponibilités/);
});

test("agent payload is French with data collection", () => {
  const body = buildAgentPayload({ business: biz, prompt: "P", voiceId: "v1", dataCollection: { name: { type: "string", description: "Nom" } } });
  assert.equal(body.conversation_config.agent.language, "fr");
  assert.equal(body.conversation_config.tts.voice_id, "v1");
  assert.equal(body.conversation_config.tts.model_id, "eleven_flash_v2_5");
  assert.equal(body.conversation_config.tts.agent_output_audio_format, "ulaw_8000");
  assert.equal(body.conversation_config.asr.user_input_audio_format, "ulaw_8000");
  assert.deepEqual(body.platform_settings.data_collection, { name: { type: "string", description: "Nom" } });
  assert.equal(body.conversation_config.agent.dynamic_variables.dynamic_variable_placeholders.slot_1, "demain à 9 h");
  const noVoice = buildAgentPayload({ business: biz, prompt: "P", voiceId: null, dataCollection: {} });
  assert.equal("voice_id" in noVoice.conversation_config.tts, false);
});

test("voices: cloned then French first", () => {
  const v = toVoices([
    { voice_id: "a", name: "Zoé", labels: {}, verified_languages: [] },
    { voice_id: "b", name: "Bob", labels: { accent: "american" } },
    { voice_id: "c", name: "Léa", verified_languages: [{ language: "fr", preview_url: "https://x/fr.mp3" }], preview_url: "https://x/en.mp3" },
    { voice_id: "d", name: "Moi", category: "cloned" },
  ]);
  assert.deepEqual(v.map((x) => x.id), ["d", "c", "b", "a"]);
  assert.equal(v[1]!.preview_url, "https://x/fr.mp3");
  assert.ok(DEMO_VOICES.length > 0);
  assert.ok(DEMO_VOICES.every((x) => x.gender === "female" || x.gender === "male"));
});

test("voices carry the ElevenLabs gender label", () => {
  const v = toVoices([
    { voice_id: "f", name: "A", labels: { gender: "female" } },
    { voice_id: "m", name: "B", labels: { gender: "Male" } },
    { voice_id: "n", name: "C", labels: { gender: "neutral" } },
    { voice_id: "x", name: "D" },
  ]);
  assert.deepEqual(v.map((x) => [x.id, x.gender]), [["f", "female"], ["m", "male"], ["n", null], ["x", null]]);
});

test("Twilio parsing and French error hints", () => {
  assert.equal(parseCountry(null), "FR");
  assert.equal(parseCountry("us"), "US");
  assert.equal(parseCountry("DE"), null);
  assert.deepEqual(parseAvailable({ available_phone_numbers: [{ phone_number: "+33450000000", friendly_name: "04 50", locality: "", capabilities: { voice: true } }] }, "local"),
    [{ e164: "+33450000000", friendly_name: "04 50", locality: null, type: "local" }]);
  assert.deepEqual(parseIncoming({ incoming_phone_numbers: [{ sid: "PN1", phone_number: "+1415", voice_url: "" }, { sid: "PN2" }] }),
    [{ e164: "+1415", sid: "PN1", friendly_name: "+1415", voice_url: null }]);
  assert.match(twilioErrorHint(400, JSON.stringify({ code: 21649, message: "Bundle required" })), /dossier réglementaire/);
  assert.match(twilioErrorHint(401, "{}"), /identifiants/);
  assert.match(twilioErrorHint(500, "boom"), /Twilio a refusé la demande \(500\) : boom/);
});

test("self-employed without a company name: « prénom nom, métier » in the greeting and the prompt", () => {
  const solo = { ...biz, name: "", first_name: "Marc", last_name: "Durand", trade: "plombier", greeting: "" };
  assert.equal(firstMessage(solo), "Bonjour, ici l’assistant de Marc Durand, plombier. Marc est sur un chantier, que puis-je faire pour vous\u00a0?");
  assert.match(buildSystemPrompt(solo, [], []), /assistant de Marc, de Marc Durand, plombier à Annecy\./);
});

test("demo: the team's voice is found by its first name, own voices first", async () => {
  const { pickTeamVoice, shortVoiceName } = await import("../src/lib/voices.ts");
  const list = [
    { voice_id: "a", name: "Quentina", category: "premade" },
    { voice_id: "b", name: "quentin dupont", category: "professional" },
    { voice_id: "c", name: "George", category: "premade" },
  ];
  assert.equal(pickTeamVoice(list, "Quentin")?.voice_id, "b");
  assert.equal(pickTeamVoice(list, "Paul"), null);
  assert.equal(shortVoiceName("Quentin Dupont"), "Quentin");
});
