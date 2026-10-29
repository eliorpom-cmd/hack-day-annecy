import type { APIRoute } from "astro";
import { db } from "../../../lib/db";
import { requireBusiness } from "../../../lib/env";
import { REPLY_MAX } from "../../../lib/google.ts";
import { testReviews } from "../../../lib/google-profile";
import { handle, HttpError, isRecord, json, readJson } from "../../../lib/http";

// Publishes the artisan's reply to a review of his profile: {review_id, reply} → {reply}
// (test reviews for now: the reply is stored here and shown under the review)
export const POST: APIRoute = handle(async ({ request, locals }) => {
  const b = requireBusiness(locals);
  const body = await readJson(request);
  const id = isRecord(body) && typeof body.review_id === "string" ? body.review_id : "";
  const reply = isRecord(body) && typeof body.reply === "string" ? body.reply.trim() : "";
  if (!testReviews(b).some((r) => r.id === id)) throw new HttpError(404, "review_not_found", "Cet avis n’existe plus. Rechargez la page.");
  if (reply.length < 3) throw new HttpError(400, "empty_reply", "Écrivez la réponse avant de la publier.");
  if (reply.length > REPLY_MAX) throw new HttpError(400, "reply_too_long", `La réponse est trop longue : ${REPLY_MAX} caractères au plus.`);
  await db().prepare(
    "INSERT INTO google_review_replies (business_id, review_id, reply) VALUES (?, ?, ?) ON CONFLICT(business_id, review_id) DO UPDATE SET reply = excluded.reply, created_at = unixepoch()",
  ).bind(b.id, id, reply).run();
  return json({ reply });
});
