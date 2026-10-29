import { test } from "node:test";
import assert from "node:assert/strict";
import {
  anonymiseSubject, buildPostPrompt, buildTopics, clampText, composerUrl, dropInventedClaims, finalizePost,
  initials, isRateLimited, normaliseHashtag, parsePostRequest, scrubContact, seasonOf, serviceLabel,
} from "../src/lib/social.ts";

const biz = { name: "Plomberie Démo", trade: "plombier", city: "Annecy", description: "Plombier à Annecy.", first_name: "Marc" };

test("call subjects lose names, addresses and phones", () => {
  const lead = { name: "Claire Martin", address: "12 rue Royale, 74000 Annecy" };
  assert.equal(anonymiseSubject("Fuite chez Mme Martin, 12 rue Royale", lead), "fuite");
  assert.equal(anonymiseSubject("Chauffe-eau à remplacer pour Claire au 06 12 34 56 78", lead), "chauffe-eau à remplacer");
  assert.equal(anonymiseSubject("WC bouché", {}), "WC bouché");
  assert.equal(anonymiseSubject("Martin", lead), null);
  assert.equal(anonymiseSubject("", lead), null);
  assert.ok((anonymiseSubject("a ".repeat(5) + "très longue demande de rénovation complète de la salle de bain", {}) ?? "").length <= 40);
  assert.equal(scrubContact("Écrire à jean@ex.fr, 74000"), "Écrire à,");
});

test("topics: up to 3 anonymised jobs, season, services, before/after", () => {
  const leads = [
    { name: "Claire Martin", address: "12 rue Royale", subject: "fuite d'eau", need: null },
    { name: "Julien Bernard", address: null, subject: "chauffe-eau à remplacer", need: null },
    { name: "Sophie", address: null, subject: "Fuite d'eau", need: null },
    { name: "Marc", address: null, subject: null, need: "Robinet de cuisine qui goutte" },
    { name: "X", address: null, subject: "WC bouché", need: null },
  ];
  const faqs = [{ question: "Combien coûte un débouchage d'évier ?", kind: "price" }, { question: "Intervenez-vous le samedi ?", kind: "info" }, { question: "Proposez-vous l'entretien de chaudière ?", kind: "info" }];
  const t = buildTopics({ leads, faqs, date: new Date("2026-10-29"), trade: "plombier" });
  assert.deepEqual(t.map((x) => x.label), ["Fuite d'eau", "Chauffe-eau à remplacer", "Robinet de cuisine qui goutte", "Conseil d’automne", "Débouchage d'évier", "Entretien de chaudière", "Avant / après"]);
  assert.ok(t.every((x) => !/Martin|Claire|Royale/.test(x.prompt)));
});

test("season and service labels", () => {
  assert.equal(seasonOf(new Date("2026-01-10")), "hiver");
  assert.equal(seasonOf(new Date("2026-07-10")), "été");
  assert.equal(serviceLabel("Quel est le prix d'un ballon d'eau chaude ?"), "Ballon d'eau chaude");
  assert.equal(serviceLabel("Pouvez-vous me rappeler demain matin si possible pour un devis ?"), null);
});

test("request validation", () => {
  assert.equal(parsePostRequest({ network: "tiktok", topic: "Fuite" }).ok, false);
  assert.equal(parsePostRequest({ network: "facebook", topic: "x" }).ok, false);
  assert.equal(parsePostRequest({ network: "facebook", topic: "y".repeat(201) }).ok, false);
  assert.equal(parsePostRequest(null).ok, false);
  const ok = parsePostRequest({ network: "instagram", topic: "  Salle de bain finie, M. Dupont 06 12 34 56 78 " });
  assert.deepEqual(ok, { ok: true, value: { network: "instagram", topic: "Salle de bain finie," } });
});

test("prompt carries business, topic and the network rule", () => {
  const p = buildPostPrompt(biz, "Intervention récente : fuite d'eau", "instagram", ["Débouchage"]);
  assert.match(p, /Ville : Annecy/);
  assert.match(p, /Prénom de l'artisan : Marc/);
  assert.match(p, /Services : Débouchage/);
  assert.match(p, /3 à 5 hashtags/);
  assert.match(buildPostPrompt(biz, "x", "linkedin"), /jamais plus/);
});

test("invented prices, ratings and unknown numbers are dropped", () => {
  const out = dropInventedClaims("Fuite réparée à Annecy. Seulement 89 € ! Déjà 200 clients satisfaits. Mon ballon de 200 L tient.", "ballon 200 L");
  assert.equal(out, "Fuite réparée à Annecy. Mon ballon de 200 L tient.");
});

test("clamps and hashtags per network", () => {
  assert.equal(clampText("Une phrase. Deux phrases. Trois phrases.", 26), "Une phrase. Deux phrases.");
  assert.equal(normaliseHashtag("#plombier annecy"), "PlombierAnnecy");
  assert.equal(normaliseHashtag("Haute-Savoie"), "HauteSavoie");
  assert.equal(normaliseHashtag("#"), null);
  const ctx = { business: biz, context: "", phone: "+33450000000" };
  const ig = finalizePost("instagram", { text: "Fuite réparée ce matin à Annecy — tout est sec. #plomberie", hashtags: [] }, ctx)!;
  assert.match(ig, /Fuite réparée ce matin à Annecy, tout est sec\./);
  assert.match(ig, /Appelez le 04 50 00 00 00\./);
  const igTags = ig.match(/#\w+/g)!;
  assert.ok(igTags.length >= 3 && igTags.length <= 5, ig);
  assert.equal(igTags[0], "#Plomberie");
  const li = finalizePost("linkedin", { text: "Chantier terminé à Annecy 🔧. Merci pour la confiance.", hashtags: ["a1", "b2", "c3", "d4"] }, ctx)!;
  assert.equal(li.match(/#\w+/g)!.length, 2);
  assert.ok(!/🔧/.test(li));
  const fb = finalizePost("facebook", { text: "Phrase utile pour les clients. ".repeat(40) }, { ...ctx, phone: null })!;
  assert.ok(fb.length <= 600);
  assert.equal(finalizePost("facebook", { text: "Court" }, ctx), null);
  assert.equal(finalizePost("facebook", null, ctx), null);
});

test("composer links, initials, rate limit", () => {
  assert.equal(composerUrl("facebook", "x"), "https://www.facebook.com/");
  assert.match(composerUrl("linkedin", "Bonjour Annecy"), /shareActive=true&text=Bonjour%20Annecy/);
  assert.equal(initials("Plomberie Démo"), "PD");
  assert.equal(initials("L'Atelier de Marc"), "AM");
  assert.equal(initials(""), "A");
  const now = 100000;
  assert.equal(isRateLimited([], now), false);
  assert.equal(isRateLimited(Array(8).fill(now - 60), now), true);
  assert.equal(isRateLimited(Array(8).fill(now - 700), now), false);
  assert.equal(isRateLimited(Array(40).fill(now - 3600), now), true);
});

test("post age", async () => {
  const { postAge } = await import("../src/lib/social.ts");
  assert.equal(postAge(1000, 1030), "À l’instant");
  assert.equal(postAge(1000, 1000 + 720), "Il y a 12 min");
  assert.equal(postAge(1000, 1000 + 3 * 3600), "Il y a 3 h");
  assert.equal(postAge(Date.UTC(2026, 9, 27) / 1000, Date.UTC(2026, 9, 29) / 1000), "Le 27/10");
});
