import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRecap, MAX_LEADS_IN_EMAIL, type RecapLead } from "../src/lib/recap-format.ts";

const weekStart = new Date("2026-10-22T00:00:00Z");

function lead(overrides: Partial<RecapLead> = {}): RecapLead {
  return { name: "Jean Dupont", phone: "+33612345678", need: "Fuite d'eau", urgency: "normal", status: "nouveau", ...overrides };
}

test("subject carries the call and urgency counts", () => {
  const r = buildRecap({ businessName: "Plomberie Martin", weekStart, calls: 12, handledByAgent: 9, urgent: 3, leads: [lead()] });
  assert.equal(r.subject, "Votre semaine : 12 appels, 3 urgences");
});

test("singular forms are used for one call and one urgency", () => {
  const r = buildRecap({ businessName: "X", weekStart, calls: 1, handledByAgent: 1, urgent: 1, leads: [lead()] });
  assert.equal(r.subject, "Votre semaine : 1 appel, 1 urgence");
});

test("user data is HTML-escaped in the HTML version", () => {
  const r = buildRecap({
    businessName: "<b>Bad</b> & Co",
    weekStart,
    calls: 1,
    handledByAgent: 1,
    urgent: 0,
    leads: [lead({ name: "<script>alert('x')</script>", need: "\"quote\" & more" })],
  });
  assert.ok(!r.html.includes("<script>alert"));
  assert.ok(r.html.includes("&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;"));
  assert.ok(r.html.includes("&quot;quote&quot; &amp; more"));
  assert.ok(r.html.includes("&lt;b&gt;Bad&lt;/b&gt; &amp; Co"));
});

test("plain text version is not escaped and keeps the lead name", () => {
  const r = buildRecap({ businessName: "Martin", weekStart, calls: 1, handledByAgent: 1, urgent: 0, leads: [lead({ name: "<script>" })] });
  assert.ok(r.text.includes("<script>"));
  assert.ok(!r.text.includes("&lt;"));
});

test("at most 10 leads are listed, with a pointer to the rest", () => {
  const leads = Array.from({ length: 13 }, (_, i) => lead({ name: `Client ${i + 1}` }));
  const r = buildRecap({ businessName: "Martin", weekStart, calls: 13, handledByAgent: 13, urgent: 0, leads });
  assert.equal(MAX_LEADS_IN_EMAIL, 10);
  for (let i = 1; i <= 10; i++) assert.ok(r.html.includes(`Client ${i}<`), `Client ${i} missing`);
  assert.ok(!r.html.includes("Client 11<"));
  assert.ok(r.html.includes("Nouveaux clients (13)"));
  assert.ok(r.html.includes("et 3 autre(s)"));
  assert.ok(r.text.includes("et 3 autre(s)"));
  assert.ok(!r.text.includes("Client 11"));
});

test("empty week uses the empty wording and no lead table", () => {
  const r = buildRecap({ businessName: "Martin", weekStart, calls: 0, handledByAgent: 0, urgent: 0, leads: [] });
  assert.equal(r.subject, "Votre semaine : aucun appel");
  assert.ok(r.html.includes("Aucun appel n&#39;a été reçu cette semaine"));
  assert.ok(!r.html.includes("<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\""));
  assert.ok(r.text.includes("Aucun appel n'a été reçu cette semaine"));
});

test("calls without new leads say so", () => {
  const r = buildRecap({ businessName: "Martin", weekStart, calls: 4, handledByAgent: 4, urgent: 0, leads: [] });
  assert.ok(r.html.includes("Aucune nouvelle demande cette semaine."));
  assert.ok(r.text.includes("Aucune nouvelle demande cette semaine."));
});

test("period label spans seven days from weekStart", () => {
  const r = buildRecap({ businessName: "Martin", weekStart: new Date("2026-10-26T00:00:00Z"), calls: 1, handledByAgent: 1, urgent: 0, leads: [] });
  assert.ok(r.text.includes("Du 26 octobre au 1 novembre"));
});

test("status and urgency are shown in French, missing values get a placeholder", () => {
  const r = buildRecap({
    businessName: "Martin",
    weekStart,
    calls: 1,
    handledByAgent: 1,
    urgent: 1,
    leads: [lead({ name: null, phone: null, urgency: "urgence", status: "devis" })],
  });
  assert.ok(r.text.includes("- Non renseigné | Non renseigné | Fuite d'eau | Urgent | Devis"));
});
