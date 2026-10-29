import { test } from "node:test";
import assert from "node:assert/strict";
import { buildInterviewInput, fallbackQuestions, MAX_QUESTIONS, MIN_QUESTIONS, parseInterview, sameQuestion } from "../src/lib/interview.ts";

const NB = " ";

test("model answer: cleaned questions, kind kept or guessed from the wording", () => {
  const q = parseInterview({ questions: [
    { question: "  vous vous déplacez jusqu'où ", kind: "info" },
    { question: "Combien coûte un débouchage ?", kind: "info" },
    { question: "Le devis est-il gratuit ?", kind: "info" },
    { question: "Travaillez-vous le dimanche ?", kind: "info" },
    { question: "Quels paiements acceptez-vous ?", kind: "info" },
  ] });
  assert.equal(q.length, 5);
  assert.equal(q[0].question, `Vous vous déplacez jusqu'où${NB}?`);
  assert.equal(q[1].kind, "price");
  assert.equal(q[2].kind, "info");
});

test("drops duplicates and questions the site already answered, caps at 7", () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ question: `Question numéro ${i} sur le sujet ${"abcdefghijkl"[i]}${"x".repeat(i)} ?`, kind: "info" }));
  assert.equal(parseInterview({ questions: many }).length, MAX_QUESTIONS);
  const q = parseInterview({ questions: [
    { question: "Le devis est-il gratuit ?" }, { question: "Le devis est gratuit ?" },
    { question: "Combien coûte le déplacement ?" },
  ] }, { faqs: [{ question: "Combien coûtent vos frais de déplacement ?", answer: "30 €" }] });
  assert.equal(q.filter((x) => /devis/i.test(x.question)).length, 1);
  assert.ok(!q.some((x) => /déplacement/i.test(x.question)));
});

test("too few or broken AI answers are topped up from the fallback list", () => {
  assert.ok(parseInterview(null).length >= MIN_QUESTIONS);
  assert.ok(parseInterview({ questions: "nope" }).length >= MIN_QUESTIONS);
  const one = parseInterview({ questions: [{ question: "Faites-vous les chauffe-eau ?" }] });
  assert.ok(one.length >= MIN_QUESTIONS && one.length <= MAX_QUESTIONS);
  assert.equal(one[0].question, `Faites-vous les chauffe-eau${NB}?`);
});

test("fallback questions skip topics already covered", () => {
  const all = fallbackQuestions();
  assert.ok(all.length >= MIN_QUESTIONS);
  assert.ok(all.some((q) => q.kind === "price"));
  const some = fallbackQuestions({ description: "Devis gratuit, intervention 7j/7 en Haute-Savoie.", faqs: [{ question: "Moyens de paiement ?", answer: "Chèque, espèces" }] });
  assert.ok(!some.some((q) => /devis|week-end|paiement/i.test(q.question)));
});

test("same question in other words", () => {
  assert.ok(sameQuestion("Le devis est-il gratuit ?", "Est-ce que le devis est gratuit ?"));
  assert.ok(!sameQuestion("Le devis est-il gratuit ?", "Combien coûte le déplacement ?"));
});

test("model input lists the record and the answered questions", () => {
  const s = buildInterviewInput({ name: "Plomberie Martin", trade: "plombier", faqs: [{ question: "Zone ?", answer: "Annecy" }] });
  assert.match(s, /Métier : plombier/);
  assert.match(s, /- Zone \? → Annecy/);
  assert.match(buildInterviewInput({}), /\(aucune\)/);
});
