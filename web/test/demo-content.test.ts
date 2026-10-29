import { test } from "node:test";
import assert from "node:assert/strict";
import { demoAdRaw, demoDescriptionRaw, demoHeadline, demoPages, demoPostRaw, demoPostsRaw, demoReplyRaw } from "../src/lib/demo-content.ts";
import { buildGoogleDraft, buildMetaDraft } from "../src/lib/ads.ts";
import { finalizePost, normalizePageUrl } from "../src/lib/social.ts";

const b = { name: "Plomberie Martin", trade: "plombier", city: "Annecy", first_name: "Marc", last_name: "Martin", description: "" };

test("demo page addresses are valid for each network", () => {
  const pages = demoPages(b);
  assert.equal(normalizePageUrl("facebook", pages.facebook), "https://www.facebook.com/plomberiemartin.annecy");
  assert.equal(normalizePageUrl("instagram", pages.instagram), "https://www.instagram.com/plomberie.martin");
  assert.equal(normalizePageUrl("linkedin", pages.linkedin), "https://www.linkedin.com/company/plomberie-martin");
  assert.equal(pages.google, "https://g.page/plomberie-martin-annecy");
});

test("demo posts follow the topic and survive the post cleanup", () => {
  const raw = demoPostRaw(b, "instagram", "Les bons réflexes en cas de fuite d'eau");
  assert.match(raw.text, /fuite/);
  const post = finalizePost("instagram", raw, { business: b, context: raw.text, phone: "+33639980000" });
  assert.ok(post && post.includes("06 39 98 00 00") && /#\w/.test(post));
  assert.match(demoPostRaw(b, "linkedin", "Se présenter : qui je suis").text, /Je suis Marc/);
  assert.match(demoPostRaw(b, "facebook", "Robinet qui goutte").text, /Robinet qui goutte/);
});

test("demo ads fill every Google and Meta field within the limits", () => {
  const g = buildGoogleDraft(demoAdRaw(b, "google"), b);
  assert.equal(g.overflow, 0);
  assert.equal(g.draft.headlines.length, 3);
  assert.ok(g.draft.keywords.length >= 10);
  const m = buildMetaDraft(demoAdRaw(b, "meta"), b, []);
  assert.equal(m.overflow, 0);
  assert.match(m.draft.primaryText, /Plomberie Martin/);
});

test("demo Google texts and site headline", () => {
  assert.ok(demoDescriptionRaw(b).description.length > 80);
  assert.notEqual(demoDescriptionRaw(b).description, demoDescriptionRaw(b, true).description);
  assert.equal(demoPostsRaw(b).ideas.length, 3);
  assert.notEqual(demoReplyRaw(b, 5).reply, demoReplyRaw(b, 1).reply);
  assert.match(demoHeadline(b), /^Plombier à Annecy/);
});
