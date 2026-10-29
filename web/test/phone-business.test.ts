import { test } from "node:test";
import assert from "node:assert/strict";
import { formatFrench, normalizeE164 } from "../src/lib/phone.ts";
import { isLeadStatus, sanitizeBusinessPatch, validateFaq, validateHours } from "../src/lib/business.ts";

test("French numbers become E.164", () => {
  assert.equal(normalizeE164("06 12 34 56 78"), "+33612345678");
  assert.equal(normalizeE164("06.12.34.56.78"), "+33612345678");
  assert.equal(normalizeE164("+33 (0)6 12 34 56 78"), "+33612345678");
  assert.equal(normalizeE164("0033612345678"), "+33612345678");
  assert.equal(normalizeE164("+1 415 555 0100"), "+14155550100");
  assert.equal(normalizeE164("4155550100", "US"), "+14155550100");
  assert.equal(normalizeE164("12345"), null);
  assert.equal(normalizeE164("pas un numéro"), null);
  assert.equal(formatFrench("+33612345678"), "06 12 34 56 78");
});

test("business patch keeps only whitelisted, valid fields", () => {
  const r = sanitizeBusinessPatch({ name: " Plomberie Dupont ", owner_id: "hacker", id: "x", elevenlabs_agent_id: "y", artisan_phone: "0612345678", ring_seconds: 20, advanced_mode: true, website: "dupont.fr" });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.value, { name: "Plomberie Dupont", artisan_phone: "+33612345678", ring_seconds: 20, advanced_mode: 1, website: "https://dupont.fr/" });
  assert.ok(!sanitizeBusinessPatch({ ring_seconds: 4 }).ok);
  assert.ok(!sanitizeBusinessPatch({ ring_seconds: 41 }).ok);
  assert.ok(!sanitizeBusinessPatch({ artisan_phone: "123" }).ok);
  assert.ok(!sanitizeBusinessPatch({ onboarding_step: "nope" }).ok);
  assert.ok(!sanitizeBusinessPatch({ name: 42 }).ok);
  const named = sanitizeBusinessPatch({ first_name: "  Jean  Marc ", voice_gender: "female" });
  assert.ok(named.ok && named.value.first_name === "Jean Marc" && named.value.voice_gender === "female");
  assert.ok(!sanitizeBusinessPatch({ voice_gender: "other" }).ok);
  assert.ok(!sanitizeBusinessPatch({ first_name: "x".repeat(61) }).ok);
  const noGender = sanitizeBusinessPatch({ voice_gender: null });
  assert.ok(noGender.ok && noGender.value.voice_gender === null);
  const cleared = sanitizeBusinessPatch({ artisan_phone: "", website: null });
  assert.ok(cleared.ok && cleared.value.artisan_phone === null && cleared.value.website === null);
});

test("hours are validated and sorted", () => {
  const r = validateHours([{ weekday: 1, opens: "08:00", closes: "12:00" }, { weekday: 0, opens: "14:00", closes: "18:00" }, { weekday: 0, opens: "08:00", closes: "12:00" }]);
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.value.map((h) => `${h.weekday} ${h.opens}`), ["0 08:00", "0 14:00", "1 08:00"]);
  assert.ok(!validateHours([{ weekday: 7, opens: "08:00", closes: "12:00" }]).ok);
  assert.ok(!validateHours([{ weekday: 0, opens: "18:00", closes: "08:00" }]).ok);
  assert.ok(!validateHours([{ weekday: 0, opens: "8h", closes: "12:00" }]).ok);
  assert.ok(!validateHours({}).ok);
});

test("faq and lead status checks", () => {
  assert.ok(validateFaq({ question: "Prix ?", answer: "49 €", kind: "price" }).ok);
  const d = validateFaq({ question: "Zone ?", answer: "Annecy" });
  assert.ok(d.ok && d.value.kind === "info");
  assert.ok(!validateFaq({ question: "", answer: "x" }).ok);
  assert.ok(!validateFaq({ question: "q", answer: "a", kind: "autre" }).ok);
  assert.ok(isLeadStatus("devis"));
  assert.ok(!isLeadStatus("done"));
});
