import { test } from "node:test";
import assert from "node:assert/strict";
import {
  baseSlug, buildSiteContent, cleanHeadline, formatTime, groupHours, pickSlug, priceAmount, priceLabel, slugify, templateHeadline,
} from "../src/lib/site.ts";

test("slugify folds French accents and punctuation", () => {
  assert.equal(slugify("Plomberie Démo"), "plomberie-demo");
  assert.equal(slugify("L'Œil du Maçon & Fils"), "l-oeil-du-macon-et-fils");
  assert.equal(slugify("  Électricité   Générale — Annecy !! "), "electricite-generale-annecy");
  assert.equal(slugify("ÇA"), "ca");
  assert.equal(slugify("!!!"), "");
  assert.ok(slugify("a".repeat(100)).length <= 60);
});

test("base slug falls back to trade and city", () => {
  assert.equal(baseSlug({ name: "", trade: "plombier", city: "Annecy" }), "plombier-annecy");
  assert.equal(baseSlug({ name: "", trade: "", city: "" }), "artisan");
});

test("pickSlug adds a number when taken", () => {
  assert.equal(pickSlug("martin", []), "martin");
  assert.equal(pickSlug("martin", ["martin", "martin-2"]), "martin-3");
});

test("time and hours grouping", () => {
  assert.equal(formatTime("08:00"), "8 h");
  assert.equal(formatTime("14:30"), "14 h 30");
  const h = (weekday: number, opens: string, closes: string) => ({ weekday, opens, closes });
  assert.deepEqual(groupHours([h(0, "08:00", "18:00"), h(1, "08:00", "18:00"), h(2, "08:00", "18:00"), h(3, "08:00", "18:00"), h(4, "08:00", "17:00")]), [
    { days: "Lundi au jeudi", time: "8 h à 18 h", closed: false },
    { days: "Vendredi", time: "8 h à 17 h", closed: false },
    { days: "Samedi et dimanche", time: "Fermé", closed: true },
  ]);
  assert.deepEqual(groupHours([h(0, "14:00", "18:00"), h(0, "08:00", "12:00")])[0], { days: "Lundi", time: "8 h à 12 h, 14 h à 18 h", closed: false });
  assert.deepEqual(groupHours([]), []);
});

test("price label and amount come from the documentation only", () => {
  assert.equal(priceLabel("Combien coûte un débouchage d'évier ou de WC ?"), "Débouchage d'évier ou de WC");
  assert.equal(priceLabel("Combien coûte le déplacement ?"), "Déplacement");
  assert.equal(priceLabel("Quel est le prix d'une recherche de fuite ?"), "Recherche de fuite");
  assert.equal(priceAmount("Entre 90 et 150 € TTC selon l'accès."), "90 à 150 €");
  assert.equal(priceAmount("Entre 900 et 1 800 € TTC pose comprise."), "900 à 1 800 €");
  assert.equal(priceAmount("De 80 à 120 euros."), "80 à 120 €");
  assert.equal(priceAmount("À partir de 60 € HT."), "À partir de 60 €");
  assert.equal(priceAmount("Le déplacement est facturé 49 € TTC à Annecy."), "49 €");
  assert.equal(priceAmount("Sur devis uniquement."), null);
});

test("headline cleanup rejects bad model output", () => {
  assert.equal(cleanHeadline("« Dépannage plomberie et chauffage à Annecy »"), "Dépannage plomberie et chauffage à Annecy.");
  assert.equal(cleanHeadline("Nous réparons tout !"), null);
  assert.equal(cleanHeadline("Court"), null);
  assert.equal(cleanHeadline(42), null);
  assert.equal(cleanHeadline("<think>hmm</think>Plombier à Annecy et alentours."), "Plombier à Annecy et alentours.");
  assert.equal(templateHeadline({ trade: "plombier", city: "Annecy", description: "" }), "Plombier à Annecy.");
});

const DEMO = {
  business: { name: "Plomberie Démo", trade: "plombier", city: "Annecy", description: "Dépannage plomberie et chauffage, Annecy et alentours.", artisan_phone: "+33639980000" },
  faqs: [
    { question: "Combien coûte le déplacement ?", answer: "Le déplacement est facturé 49 € TTC.", kind: "price" },
    { question: "Combien coûte un débouchage ?", answer: "Entre 90 et 150 € TTC selon l'accès.", kind: "price" },
    { question: "Le devis est-il gratuit ?", answer: "Oui, le devis est gratuit.", kind: "info" },
    { question: "Quelle est votre zone d'intervention ?", answer: "Annecy et 20 km autour.", kind: "info" },
  ],
  hours: [{ weekday: 0, opens: "08:00", closes: "18:00" }],
};

test("site content: area pulled out of infos, answering number wins", () => {
  const c = buildSiteContent({ ...DEMO, answeringNumber: "+33451000000" });
  assert.equal(c.phone, "+33451000000");
  assert.equal(c.phoneDisplay, "04 51 00 00 00");
  assert.equal(c.area, "Annecy et 20 km autour.");
  assert.deepEqual(c.infos, [{ question: "Le devis est-il gratuit ?", answer: "Oui, le devis est gratuit." }]);
  assert.deepEqual(c.prices.map((p) => [p.label, p.amount]), [["Déplacement", "49 €"], ["Débouchage", "90 à 150 €"]]);
  assert.equal(c.priceOnQuote, true);
  assert.equal(c.kicker, "Plombier · Annecy");
  assert.equal(c.headline, "Plombier à Annecy.");
  assert.equal(c.title, "Plomberie Démo, Plombier à Annecy");
  assert.match(c.metaDescription, /Appelez le 04 51 00 00 00\.$/);
  assert.ok(c.metaDescription.length <= 160);
});

test("site content: falls back to the artisan phone and the city", () => {
  const c = buildSiteContent({ business: { ...DEMO.business, site_headline: "Dépannage à Annecy, 7 jours sur 7." }, faqs: [], hours: [], answeringNumber: null });
  assert.equal(c.phone, "+33639980000");
  assert.equal(c.area, "Annecy");
  assert.equal(c.headline, "Dépannage à Annecy, 7 jours sur 7.");
  assert.deepEqual(c.prices, []);
  assert.equal(c.priceOnQuote, false);
  assert.deepEqual(c.hours, []);
});
