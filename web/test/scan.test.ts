import { test } from "node:test";
import assert from "node:assert/strict";
import { heuristicExtraction, htmlToText, normalizeExtraction, parseLlmJson, pickLinks, safeScanUrl } from "../src/lib/scan.ts";

const HTML = `<html><head><title>Plomberie Dupont | Plombier à Annecy</title>
<meta name="description" content="Dépannage plomberie 7j/7 à Annecy &amp; alentours.">
<style>body{color:red}</style><script>var x = "<p>caché</p>";</script></head>
<body><nav><a href="/contact">Contact</a><a href="/nos-tarifs/">Tarifs</a><a href="https://facebook.com/x">FB</a>
<a href="/mentions-legales">Mentions</a><a href="/photo.jpg">Photo</a><a href="/blog/article-12">Blog</a></nav>
<h1>Plombier &eacute;clair</h1><p>Appelez le 04 50 12 34 56</p><ul><li>Débouchage</li><li>Chauffe-eau</li></ul></body></html>`;

test("html to text drops scripts and styles, keeps structure", () => {
  const { title, text } = htmlToText(HTML);
  assert.equal(title, "Plomberie Dupont | Plombier à Annecy");
  assert.match(text, /RÉSUMÉ : Dépannage plomberie 7j\/7 à Annecy & alentours\./);
  assert.match(text, /## Plombier éclair/);
  assert.match(text, /- Débouchage/);
  assert.doesNotMatch(text, /caché|color:red/);
});

test("picks same-site useful links only", () => {
  const links = pickLinks(HTML, "https://www.dupont.fr/");
  assert.deepEqual(links.sort(), ["https://www.dupont.fr/contact", "https://www.dupont.fr/nos-tarifs"].sort());
});

test("scan URL guard", () => {
  assert.equal(safeScanUrl("dupont.fr")?.toString(), "https://dupont.fr/");
  assert.equal(safeScanUrl("http://localhost:8787"), null);
  assert.equal(safeScanUrl("http://127.0.0.1/"), null);
  assert.equal(safeScanUrl("file:///etc/passwd"), null);
  assert.equal(safeScanUrl("https://dupont.fr:8080/"), null);
  assert.equal(safeScanUrl(42), null);
});

test("LLM JSON is found inside fences, prose and think tags", () => {
  assert.deepEqual(parseLlmJson('```json\n{"name":"A {b}"}\n```'), { name: "A {b}" });
  assert.deepEqual(parseLlmJson('<think>{"no":1}</think>Voici : {"a":{"b":2}} fin'), { a: { b: 2 } });
  assert.deepEqual(parseLlmJson({ already: true }), { already: true });
  assert.equal(parseLlmJson("pas de json"), null);
  assert.equal(parseLlmJson('{"cassé": '), null);
});

test("extraction is normalized and prices are flagged", () => {
  const r = normalizeExtraction({
    name: " Plomberie  Dupont ", trade: "Plombier", city: "Annecy", description: "Dépannage.", phone: "04 50 12 34 56",
    hours: [{ weekday: 0, opens: "8:00", closes: "18h" }, { weekday: 9, opens: "08:00", closes: "12:00" }, { weekday: 1, opens: "18:00", closes: "08:00" }],
    faqs: [{ question: "Prix du déplacement ?", answer: "49 € TTC", kind: "info" }, { question: "Zone ?", answer: "Annecy" }, { question: "vide" }],
  });
  assert.equal(r.name, "Plomberie Dupont");
  assert.equal(r.trade, "plombier");
  assert.equal(r.phone, "+33450123456");
  assert.deepEqual(r.hours, [{ weekday: 0, opens: "08:00", closes: "18:00" }]);
  assert.deepEqual(r.faqs.map((f) => f.kind), ["price", "info"]);
  const empty = normalizeExtraction({}, { name: "Repli" });
  assert.equal(empty.name, "Repli");
  assert.deepEqual(empty.faqs, []);
});

test("heuristic fallback without AI", () => {
  const page = htmlToText(HTML);
  const r = heuristicExtraction([page], "www.dupont.fr");
  assert.equal(r.name, "Plomberie Dupont");
  assert.equal(r.phone, "+33450123456");
  assert.equal(r.trade, "plombier");
  assert.match(r.description, /Dépannage plomberie/);
});
