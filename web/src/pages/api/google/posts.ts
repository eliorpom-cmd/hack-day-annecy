import type { APIRoute } from "astro";
import { requireBusiness } from "../../../lib/env";
import { AI_FAILED_HINT, parsePosts, POSTS_SYSTEM, postsPrompt } from "../../../lib/google.ts";
import { factsFor, generate, limit } from "../../../lib/google-run";
import { fail, handle, json } from "../../../lib/http";
import { isDemoAccount } from "../../../lib/demo-voice";
import { demoPostsRaw } from "../../../lib/demo-content";

// 3 seasonal « actualités » for the Google profile → {ideas:[{title, text}]}
export const POST: APIRoute = handle(async ({ locals }) => {
  const b = requireBusiness(locals);
  const facts = await factsFor(b);
  // Demo: written in advance, no AI call
  if (isDemoAccount(locals.user)) {
    const ideas = parsePosts(demoPostsRaw(b), facts);
    if (ideas) return json({ ideas });
  }
  limit(b.id);
  const ideas = await generate(POSTS_SYSTEM, postsPrompt(facts, new Date()), (d) => parsePosts(d, facts), { temperature: 0.7, maxTokens: 1200 });
  if (!ideas) return fail(502, "ai_failed", AI_FAILED_HINT);
  return json({ ideas });
});
