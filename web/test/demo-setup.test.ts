import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  canTakeOverNumber, DEMO_INTERVIEW, DEMO_SCAN, demoMobile, demoSetup, demoSiteUrl, isDemoSetupEmail, pickDemoVoice, trialEmail,
} from "../src/lib/demo-setup.ts";
import { sanitizeBusinessPatch, validateFaq, validateHours } from "../src/lib/business.ts";

const site = readFileSync(new URL("../public/plomberie-martin/index.html", import.meta.url), "utf8");
const siteText = site.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");

test("demo marker: only the trial accounts of « Essayer la configuration »", () => {
  assert.equal(isDemoSetupEmail(trialEmail("abc123")), true);
  assert.equal(isDemoSetupEmail("essai-abc@demo.local"), true);
  assert.equal(isDemoSetupEmail("marc@plomberie-martin.fr"), false);
  assert.equal(isDemoSetupEmail("demo@demo.local"), false);
  assert.equal(isDemoSetupEmail("essai-x@demo.local.evil.fr"), false);
  assert.equal(isDemoSetupEmail(null), false);
  assert.equal(isDemoSetupEmail(undefined), false);
});

test("number takeover: a trial account takes it from another demo run, never from a real artisan", () => {
  const trial = { email: trialEmail("new") };
  assert.equal(canTakeOverNumber(trial, { id: "old", email: trialEmail("old") }), true);
  assert.equal(canTakeOverNumber(trial, { id: "demo", email: "demo@demo.local" }), true);
  assert.equal(canTakeOverNumber(trial, { id: "u1", email: "marc@plomberie-martin.fr" }), false);
  assert.equal(canTakeOverNumber({ email: "marc@plomberie-martin.fr" }, { id: "old", email: trialEmail("old") }), false);
  assert.equal(canTakeOverNumber(trial, null), false);
});

test("site address: the public URL of the fake site, whatever the origin", () => {
  assert.equal(demoSiteUrl("https://hack-day-annecy.eliorpom-0bc.workers.dev"), "https://hack-day-annecy.eliorpom-0bc.workers.dev/plomberie-martin/");
  assert.equal(demoSiteUrl("http://localhost:4321/"), "http://localhost:4321/plomberie-martin/");
});

test("mobile: from DEMO_MOBILE only, normalized, empty when missing or invalid", () => {
  assert.equal(demoMobile("06 98 76 54 32"), "+33698765432");
  assert.equal(demoMobile("+33698765432"), "+33698765432");
  assert.equal(demoMobile(undefined), null);
  assert.equal(demoMobile("  "), null);
  assert.equal(demoMobile("pas un numéro"), null);
  assert.equal(demoSetup({ origin: "http://localhost:4321" }).mobile, null);
  // The phone printed on the fake site is never used as the artisan's mobile
  assert.ok(!JSON.stringify(demoSetup({ origin: "http://x" })).includes("612345678"));
});

test("record: Marc Martin, plombier in Annecy, accepted by PUT /api/business", () => {
  const b = DEMO_SCAN.business;
  assert.equal(b.first_name, "Marc");
  assert.equal(b.last_name, "Martin");
  assert.equal(b.trade, "plombier");
  assert.equal(b.city, "Annecy");
  assert.equal(b.name, "Plomberie Martin");
  assert.ok(siteText.includes("Plomberie Martin") && siteText.includes("Marc Martin") && siteText.includes("12 rue Royale, 74000 Annecy"));
  const r = sanitizeBusinessPatch({ ...b, artisan_phone: "06 98 76 54 32", website: demoSiteUrl("https://x.workers.dev") });
  assert.ok(r.ok, r.ok ? "" : r.hint);
  assert.equal(r.ok && r.value.first_name, "Marc");
});

test("hours: Monday to Friday 8 h-18 h, Saturday 9 h-12 h, closed on Sunday, as on the site", () => {
  assert.ok(siteText.includes("Lundi au vendredi : 8 h-18 h") && siteText.includes("Samedi : 9 h-12 h"));
  assert.deepEqual(DEMO_SCAN.hours.map((h) => `${h.weekday} ${h.opens}-${h.closes}`), [
    "0 08:00-18:00", "1 08:00-18:00", "2 08:00-18:00", "3 08:00-18:00", "4 08:00-18:00", "5 09:00-12:00",
  ]);
  assert.ok(validateHours(DEMO_SCAN.hours).ok);
});

test("prices and documentation: the figures of the site, every line answered", () => {
  const all = JSON.stringify(DEMO_SCAN.faqs);
  for (const figure of ["49", "55", "+50", "Gratuit", "Seynod", "Sévrier", "décennale", "chèque"]) assert.ok(all.includes(figure), figure);
  for (const figure of ["49 €", "55 €/h", "+50 %", "Sévrier", "Carte bancaire".toLowerCase()]) assert.ok(siteText.toLowerCase().includes(figure.toLowerCase()), figure);
  assert.ok(DEMO_SCAN.faqs.filter((f) => f.kind === "price").length >= 3);
  for (const f of DEMO_SCAN.faqs) assert.ok(validateFaq(f).ok, f.question);
});

test("interview: pre-filled answers, questions the site does not answer, COPY.md typography", () => {
  assert.ok(DEMO_INTERVIEW.length >= 5 && DEMO_INTERVIEW.length <= 7);
  const known = new Set(DEMO_SCAN.faqs.map((f) => f.question.toLowerCase()));
  for (const q of DEMO_INTERVIEW) {
    assert.ok(validateFaq(q).ok, q.question);
    assert.ok(!known.has(q.question.toLowerCase()), q.question);
    assert.match(q.question, / \?$/);
  }
  for (const text of [...DEMO_INTERVIEW.flatMap((q) => [q.question, q.answer]), ...DEMO_SCAN.faqs.flatMap((f) => [f.question, f.answer])]) {
    assert.ok(!/[—!]|\.\.\./.test(text), text);
    assert.ok(!/ [?:;]/.test(text), `breaking space before punctuation: ${text}`);
  }
});

test("voice: a male library voice first (Marc), never his cloned voice", () => {
  const voices = [
    { id: "own", gender: null, french: true, category: "cloned" },
    { id: "charlotte", gender: "female", french: true },
    { id: "eng-male", gender: "male", french: false },
    { id: "george", gender: "male", french: true },
  ];
  assert.equal(pickDemoVoice(voices), "george");
  assert.equal(pickDemoVoice(voices.filter((v) => v.id !== "george")), "eng-male");
  assert.equal(pickDemoVoice([{ id: "a", gender: "female" }]), "a");
  assert.equal(pickDemoVoice([]), null);
  assert.equal(pickDemoVoice([...voices, { id: "jules", name: "Jules - conversational", gender: "male", category: "professional" }]), "jules");
});
