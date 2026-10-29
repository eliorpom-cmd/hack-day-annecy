import type { APIRoute } from "astro";
import { requireBusiness } from "../../../lib/env";
import { AI_FAILED_HINT, parseReply, REPLY_SYSTEM, replyPrompt, validateReview } from "../../../lib/google.ts";
import { factsFor, generate, limit } from "../../../lib/google-run";
import { fail, handle, json, readJson } from "../../../lib/http";

// Writes the artisan's reply to a pasted client review: {text, stars} → {reply}
export const POST: APIRoute = handle(async ({ locals, request }) => {
  const b = requireBusiness(locals);
  const v = validateReview(await readJson(request));
  if (!v.ok) return fail(400, "invalid_review", v.hint);
  limit(b.id);
  const facts = await factsFor(b);
  const reply = await generate(REPLY_SYSTEM, replyPrompt(facts, v.review), (d) => parseReply(d, facts), { maxTokens: 500 });
  if (!reply) return fail(502, "ai_failed", AI_FAILED_HINT);
  return json({ reply });
});
