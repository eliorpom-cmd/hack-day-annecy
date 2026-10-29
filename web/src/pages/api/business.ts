import type { APIRoute } from "astro";
import { sanitizeBusinessPatch } from "../../lib/business";
import { db, type Business } from "../../lib/db";
import { requireBusiness } from "../../lib/env";
import { handle, HttpError, isRecord, json, readJson } from "../../lib/http";

// Updates whitelisted fields of the logged-in artisan's business
export const PUT: APIRoute = handle(async ({ request, locals }) => {
  const business = requireBusiness(locals);
  const body = await readJson(request);
  if (!isRecord(body)) throw new HttpError(400, "invalid_body", "Envoyez un objet JSON avec les champs à modifier.");
  const patch = sanitizeBusinessPatch(body);
  if (!patch.ok) throw new HttpError(400, "invalid_field", patch.hint);
  const entries = Object.entries(patch.value);
  if (!entries.length) return json({ business });
  // Column names come from the whitelist in sanitizeBusinessPatch, never from the client
  const sets = entries.map(([k]) => `${k} = ?`).join(", ");
  const updated = await db().prepare(`UPDATE businesses SET ${sets} WHERE id = ? RETURNING *`)
    .bind(...entries.map(([, v]) => v), business.id).first<Business>();
  return json({ business: updated });
});
