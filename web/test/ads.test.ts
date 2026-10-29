import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildGoogleDraft, buildMetaDraft, callDestination, cleanKeyword, cleanLine, clampDaily, COUNTS, fitText, googleCopyText, isAdChannel,
  LIMITS, mergeRaw, polish, metaCopyText, monthlyTotal, parseDraft, pickFitting, radiusFromFaqs, rateCheck, retryHint, tooLongTexts, zoneSentence,
} from "../src/lib/ads.ts";

const biz = { name: "Plomberie Démo", trade: "plombier", city: "Annecy", description: "Dépannage plomberie et chauffage, Annecy et alentours." };

test("cleanLine strips emoji, exclamation marks, quotes and dashes", () => {
  assert.equal(cleanLine("  « Fuite d’eau ?  Appelez ! 🔧 »  "), "Fuite d’eau ? Appelez.");
  assert.equal(cleanLine("Plombier — Annecy"), "Plombier, Annecy");
  assert.equal(cleanLine(42), "");
});

test("fitText never splits a word and drops dangling words", () => {
  assert.equal(fitText("Plombier à Annecy", 30), "Plombier à Annecy");
  const s = fitText("Dépannage plomberie rapide et efficace à Annecy", 30);
  assert.ok(s.length <= 30);
  assert.equal(s, "Dépannage plomberie rapide");
  assert.equal(fitText("Supercalifragilisticexpialidocious", 10).length, 10);
});

test("pickFitting keeps texts that fit, counts overflow, fills with fallbacks", () => {
  const r = pickFitting(["Plombier à Annecy", "x".repeat(31), "plombier à annecy", "Urgence fuite d’eau"], 30, 3, ["Appelez maintenant"]);
  assert.deepEqual(r.items, ["Plombier à Annecy", "Urgence fuite d’eau", "Appelez maintenant"]);
  assert.equal(r.overflow, 1);
  assert.equal(r.filled, 1);
  assert.deepEqual(pickFitting("not an array", 30, 1, ["A"]).items, ["A"]);
});

test("Google draft respects every limit, even when the model ignores them", () => {
  const raw = {
    keywords: ["Plombier urgence Annecy", "PLOMBIER ANNECY", "plombier annecy", "", 3, "a b c d e f g h i"],
    headlines: ["Plombier urgence Annecy 7j/7 rapide", "Fuite d’eau ? Appelez !", "Plombier à Annecy"],
    descriptions: ["y".repeat(120), "Dépannage plomberie à Annecy. Appelez, votre demande est prise."],
  };
  const { draft, overflow } = buildGoogleDraft(raw, biz);
  assert.equal(draft.headlines.length, COUNTS.headlines);
  assert.equal(draft.descriptions.length, COUNTS.descriptions);
  assert.ok(draft.headlines.every((h) => h.length <= LIMITS.googleHeadline && !h.includes("!")));
  assert.ok(draft.descriptions.every((d) => d.length <= LIMITS.googleDescription));
  assert.ok(draft.keywords.length >= COUNTS.keywordsMin && draft.keywords.length <= COUNTS.keywordsMax);
  assert.equal(new Set(draft.keywords).size, draft.keywords.length);
  assert.ok(draft.keywords.includes("plombier urgence annecy"));
  assert.equal(overflow, 2);
});

test("Google draft from nothing still gives a complete ad", () => {
  const { draft } = buildGoogleDraft(null, { name: "", trade: "", city: "", description: "" });
  assert.equal(draft.headlines.length, 3);
  assert.equal(draft.descriptions.length, 2);
  assert.ok(draft.keywords.length >= 10);
});

test("keywords: lowercase, no punctuation, 7 words max", () => {
  assert.equal(cleanKeyword("« Plombier » Urgence, Annecy !"), "plombier urgence annecy");
  assert.equal(cleanKeyword("un deux trois quatre cinq six sept huit"), "");
});

test("Meta draft: limits, zone and call button", () => {
  const raw = { primary_text: ["z".repeat(200), "Une fuite à Annecy ? Appelez, votre demande est prise tout de suite."], headline: ["Plombier à Annecy, appelez maintenant"] };
  const { draft } = buildMetaDraft(raw, biz, [{ question: "Vous vous déplacez jusqu’où ?", answer: "Jusqu’à 25 km autour d’Annecy.", kind: "info" }]);
  assert.ok(draft.primaryText.length <= LIMITS.metaPrimary && draft.primaryText.startsWith("Une fuite"));
  assert.ok(draft.headline.length <= LIMITS.metaHeadline);
  assert.equal(draft.zone, "Dans un rayon de 25 km autour d’Annecy");
  assert.equal(draft.cta, "Appeler");
  const empty = buildMetaDraft(null, biz, []).draft;
  assert.ok(empty.primaryText.length > 0 && empty.primaryText.length <= LIMITS.metaPrimary);
  assert.ok(empty.headline.length > 0 && empty.headline.length <= LIMITS.metaHeadline);
});

test("zone: radius from documentation, elision, default", () => {
  assert.equal(radiusFromFaqs([]), 15);
  assert.equal(radiusFromFaqs([{ question: "Prix ?", answer: "80 € pour 2 km", kind: "price" }]), 15);
  assert.equal(radiusFromFaqs([{ question: "Zone", answer: "300 km", kind: "info" }]), 15);
  assert.equal(zoneSentence("Lyon", 15), "Dans un rayon de 15 km autour de Lyon");
  assert.equal(zoneSentence("Annecy", 15), "Dans un rayon de 15 km autour d’Annecy");
  assert.equal(zoneSentence("", 20), "Dans un rayon de 20 km autour de votre entreprise");
});

test("merge and retry prompt material", () => {
  assert.deepEqual(mergeRaw({ headline: "a" }, { headline: ["b"] }), { headline: ["a", "b"] });
  assert.equal(mergeRaw(null, { a: 1 })?.a, 1);
  const long = tooLongTexts({ headlines: ["court", "x".repeat(40)] }, { headlines: 30 });
  assert.equal(long.length, 1);
  assert.match(long[0], /40 caractères, maximum 30/);
});

test("budget: 5 to 30 € a day, monthly total × 30", () => {
  assert.equal(clampDaily(2), 5);
  assert.equal(clampDaily(99), 30);
  assert.equal(clampDaily("abc"), 10);
  assert.equal(monthlyTotal(10), 300);
  assert.equal(monthlyTotal(30), 900);
});

test("rate limit: sliding window per business", () => {
  const now = 10_000;
  assert.deepEqual(rateCheck([], now, 3, 3600), { ok: true, retryAfterSec: 0 });
  const r = rateCheck([now - 100, now - 50, now - 10], now, 3, 3600);
  assert.equal(r.ok, false);
  assert.equal(r.retryAfterSec, 3500);
  assert.equal(rateCheck([now - 4000, now - 50, now - 10], now, 3, 3600).ok, true);
  assert.match(retryHint(3500), /59 min/);
});

test("call destination prefers the answering number", () => {
  assert.deepEqual(callDestination("+33450000000", "+33612345678"), { e164: "+33450000000", display: "04 50 00 00 00", answering: true });
  assert.equal(callDestination(null, "+33612345678").display, "06 12 34 56 78");
  assert.equal(callDestination(null, null).e164, null);
});

test("stored drafts are validated, copy text is complete", () => {
  assert.equal(parseDraft("google", "{bad"), null);
  assert.equal(parseDraft("meta", JSON.stringify({ headline: 3 })), null);
  const g = buildGoogleDraft(null, biz).draft;
  assert.deepEqual(parseDraft("google", JSON.stringify(g)), g);
  const text = googleCopyText(g, "06 12 34 56 78", "https://x/site/a");
  assert.match(text, /Mots-clés :/);
  assert.match(text, /Numéro d’appel : 06 12 34 56 78/);
  assert.match(metaCopyText(buildMetaDraft(null, biz, []).draft, null), /Bouton : Appeler/);
  assert.ok(isAdChannel("meta") && !isAdChannel("tiktok"));
});

test("polish restores sentence case and proper names", () => {
  assert.equal(polish("plomberie démo annecy", biz), "Plomberie Démo Annecy");
  assert.equal(polish("votre plombier à annecy-le-vieux et annecy", biz), "Votre plombier à Annecy-le-vieux et Annecy");
  assert.equal(polish("PLOMBIER URGENCE", biz), "Plombier urgence");
  const { draft } = buildMetaDraft({ primary_text: "une fuite à annecy ? appelez.", headline: "votre plombier à annecy" }, biz, []);
  assert.equal(draft.headline, "Votre plombier à Annecy");
});
