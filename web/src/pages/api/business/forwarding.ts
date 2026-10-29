import type { APIRoute } from "astro";
import { db, type Business } from "../../../lib/db";
import { requireBusiness } from "../../../lib/env";
import { handle, HttpError, isRecord, json, readJson } from "../../../lib/http";

// The artisan confirms that call forwarding works on his mobile ({done: true}): the full-screen guide stops showing.
// {done: false} shows it again (Réglages, « Renvoi d’appel »).
export const POST: APIRoute = handle(async ({ request, locals }) => {
  const b = requireBusiness(locals);
  const body = await readJson(request);
  if (!isRecord(body) || typeof body.done !== "boolean") throw new HttpError(400, "invalid_body", "Envoyez {done: true} ou {done: false}.");
  const business = await db().prepare("UPDATE businesses SET forwarding_done_at = ? WHERE id = ? RETURNING *")
    .bind(body.done ? Math.floor(Date.now() / 1000) : null, b.id).first<Business>();
  return json({ business });
});
