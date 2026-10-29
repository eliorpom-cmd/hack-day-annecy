import type { APIRoute } from "astro";
import { requireBusiness } from "../../../lib/env";
import { AI_FAILED_HINT, parseReply, REPLY_SYSTEM, replyPrompt, validateReview } from "../../../lib/google.ts";
import { factsFor, generate, limit } from "../../../lib/google-run";
import { fail, handle, json, readJson } from "../../../lib/http";
import { isDemoAccount } from "../../../lib/demo-voice";
import { demoReplyRaw } from "../../../lib/demo-content";
import { testReviews } from "../../../lib/google-profile";

// Writes the artisan's reply to a pasted client review: {text, stars} → {reply}
export const POST: APIRoute = handle(async ({ locals, request }) => {
  const b = requireBusiness(locals);
  const v = validateReview(await readJson(request));
  if (!v.ok) return fail(400, "invalid_review", v.hint);
  const facts = await factsFor(b);
  // Demo: the test review's prepared reply, or one written in advance; no AI call
  if (isDemoAccount(locals.user)) {
    const prepared = testReviews(b).find((r) => r.text === v.review.text)?.reply;
    const reply = prepared ?? parseReply(demoReplyRaw(b, v.review.stars), facts);
    if (reply) return json({ reply });
  }
  limit(b.id);
  const reply = await generate(REPLY_SYSTEM, replyPrompt(facts, v.review), (d) => parseReply(d, facts), { maxTokens: 500 });
  if (!reply) return fail(502, "ai_failed", AI_FAILED_HINT);
  return json({ reply });
});
