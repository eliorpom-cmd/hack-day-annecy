import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultGreeting, isDefaultGreeting } from "../src/lib/greeting.ts";

test("library voice: assistant agreed with the voice, first name of the artisan", () => {
  assert.equal(defaultGreeting({ name: "Plomberie Martin", first_name: "Marc", voice: "male" }),
    "Bonjour, ici l’assistant de Plomberie Martin. Marc est sur un chantier, que puis-je faire pour vous ?");
  assert.equal(defaultGreeting({ name: "Plomberie Martin", first_name: "Marc", voice: "female" }),
    "Bonjour, ici l’assistante de Plomberie Martin. Marc est sur un chantier, que puis-je faire pour vous ?");
  assert.match(defaultGreeting({ name: "Plomberie Martin", first_name: " ", voice: null }), /^Bonjour, ici l’assistant de Plomberie Martin\. L’artisan est sur un chantier/);
});

test("own voice: the artisan answers as himself", () => {
  assert.equal(defaultGreeting({ name: "Plomberie Martin", first_name: "Marc", voice: "cloned" }), "Oui allô, Plomberie Martin.");
  assert.equal(defaultGreeting({ name: "", voice: "cloned" }), "Oui allô, l’entreprise.");
});

test("generated greetings follow the voice, written ones are kept", () => {
  for (const voice of ["cloned", "female", "male", null] as const)
    assert.ok(isDefaultGreeting(defaultGreeting({ name: "Élec Pro", first_name: "Léa", voice })));
  assert.ok(isDefaultGreeting(""));
  assert.ok(isDefaultGreeting("Bonjour, ici l’assistant de X. L’artisan est sur un chantier, que puis-je faire pour vous ?"));
  assert.ok(!isDefaultGreeting("Bonjour, Plomberie Démo, que puis-je faire pour vous ?"));
  assert.ok(!isDefaultGreeting("Salut, c'est Marc, laissez un message."));
});
