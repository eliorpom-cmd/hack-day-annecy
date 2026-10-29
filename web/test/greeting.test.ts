import { test } from "node:test";
import assert from "node:assert/strict";
import { businessDisplayName, defaultGreeting, isDefaultGreeting } from "../src/lib/greeting.ts";

test("library voice: assistant agreed with the voice, first name of the artisan", () => {
  assert.equal(defaultGreeting({ name: "Plomberie Martin", first_name: "Marc", voice: "male" }),
    "Bonjour, ici l’assistant de Plomberie Martin. Marc est sur un chantier, que puis-je faire pour vous ?");
  assert.equal(defaultGreeting({ name: "Plomberie Martin", first_name: "Marc", voice: "female" }),
    "Bonjour, ici l’assistante de Plomberie Martin. Marc est sur un chantier, que puis-je faire pour vous ?");
  assert.match(defaultGreeting({ name: "Plomberie Martin", first_name: " ", voice: null }), /^Bonjour, ici l’assistant de Plomberie Martin\. L’artisan est sur un chantier/);
});

test("own voice: the répondeur still introduces itself as the assistant", () => {
  assert.equal(defaultGreeting({ name: "Plomberie Martin", first_name: "Marc", voice: "cloned" }),
    "Bonjour, ici l’assistant de Plomberie Martin. Marc est sur un chantier, que puis-je faire pour vous\u00a0?");
  assert.ok(isDefaultGreeting("Oui allô, Plomberie Martin."), "the older wording is still a generated greeting");
});

test("generated greetings follow the voice, written ones are kept", () => {
  for (const voice of ["cloned", "female", "male", null] as const)
    assert.ok(isDefaultGreeting(defaultGreeting({ name: "Élec Pro", first_name: "Léa", voice })));
  assert.ok(isDefaultGreeting(""));
  assert.ok(isDefaultGreeting("Bonjour, ici l’assistant de X. L’artisan est sur un chantier, que puis-je faire pour vous ?"));
  assert.ok(!isDefaultGreeting("Bonjour, Plomberie Démo, que puis-je faire pour vous ?"));
  assert.ok(!isDefaultGreeting("Salut, c'est Marc, laissez un message."));
});

test("business name: company name first, else « prénom nom, métier » for a self-employed artisan", () => {
  assert.equal(businessDisplayName({ name: " Plomberie  Martin ", first_name: "Marc", last_name: "Martin", trade: "Plombier" }), "Plomberie Martin");
  assert.equal(businessDisplayName({ name: "", first_name: "Marc", last_name: "Durand", trade: "Plombier" }), "Marc Durand, plombier");
  assert.equal(businessDisplayName({ name: "  ", first_name: " Léa ", last_name: null, trade: "électricienne" }), "Léa, électricienne");
  assert.equal(businessDisplayName({ name: "", first_name: "", last_name: "", trade: "plombier" }), "Plombier");
  assert.equal(businessDisplayName({ name: "", first_name: "Marc", last_name: "Durand", trade: "" }), "Marc Durand");
  assert.equal(businessDisplayName({}), "");
  const name = businessDisplayName({ name: "", first_name: "Marc", last_name: "Durand", trade: "plombier" });
  assert.match(defaultGreeting({ name, first_name: "Marc", voice: "cloned" }), /^Bonjour, ici l’assistant de Marc Durand, plombier\./);
  assert.ok(isDefaultGreeting(defaultGreeting({ name, first_name: "Marc", voice: "male" })));
});
