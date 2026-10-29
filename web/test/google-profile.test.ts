import { test } from "node:test";
import assert from "node:assert/strict";
import { averageStars, creationSteps, frRating, isProfileState, reviewAge, testReviews, testStats } from "../src/lib/google-profile.ts";

const b = { trade: "Plombier", city: "Annecy", first_name: "Marc" };

test("test reviews speak of the artisan's trade and city, replies are signed", () => {
  const reviews = testReviews(b);
  assert.equal(reviews.length, 6);
  assert.ok(reviews.some((r) => r.text.includes("plombier")));
  assert.ok(reviews.some((r) => r.text.includes("Annecy")));
  assert.ok(reviews.some((r) => r.stars <= 2), "one bad review to answer");
  assert.ok(reviews.every((r) => r.reply.endsWith("\nMarc")));
  assert.equal(new Set(reviews.map((r) => r.id)).size, 6);
});

test("rating, figures and ages", () => {
  assert.equal(averageStars([{ stars: 5 }, { stars: 4 }]), 4.5);
  assert.equal(averageStars([]), 0);
  assert.equal(frRating(4.3), "4,3");
  assert.deepEqual(testStats("demo-biz"), testStats("demo-biz"));
  assert.equal(reviewAge(1), "hier");
  assert.equal(reviewAge(2), "il y a 2 jours");
  assert.equal(reviewAge(13), "il y a 2 semaines");
  assert.equal(reviewAge(52), "il y a 2 mois");
});

test("creation guide gives the artisan's own answers to copy", () => {
  const steps = creationSteps({ name: "", trade: "plombier", city: "Annecy", first_name: "Marc", last_name: "Martin", phone: "06 12 34 56 78", siteUrl: null });
  assert.equal(steps[0]!.link?.href, "https://business.google.com/create");
  assert.equal(steps[1]!.copy?.value, "Marc Martin plombier");
  assert.equal(steps[2]!.copy?.value, "Plombier");
  assert.equal(steps.find((s) => s.title === "Votre numéro")?.copy?.value, "06 12 34 56 78");
  assert.equal(steps.find((s) => s.title === "Votre site")?.copy, undefined);
});

test("profile states", () => {
  assert.ok(isProfileState("connected") && isProfileState("none") && !isProfileState("other"));
});

test("open status reads like Google Maps, in Paris time", async () => {
  const { openStatus } = await import("../src/lib/google-profile.ts");
  const week = [0, 1, 2, 3, 4].map((weekday) => ({ weekday, opens: "08:00", closes: "18:00" }));
  // Thursday 29/10/2026, 10:00 in Paris (09:00 UTC)
  assert.deepEqual(openStatus(week, new Date("2026-10-29T09:00:00Z")), { open: true, text: "Ferme à 18:00" });
  assert.deepEqual(openStatus(week, new Date("2026-10-29T05:00:00Z")), { open: false, text: "Ouvre à 08:00" });
  // Saturday: next opening on Monday
  assert.deepEqual(openStatus(week, new Date("2026-10-31T12:00:00Z")), { open: false, text: "Ouvre à 08:00 lun." });
  assert.equal(openStatus([], new Date()).open, null);
});
