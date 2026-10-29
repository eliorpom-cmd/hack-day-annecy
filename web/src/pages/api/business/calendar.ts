import type { APIRoute } from "astro";
import { db, type Business } from "../../../lib/db";
import { requireBusiness } from "../../../lib/env";
import { handle, HttpError, isRecord, json, readJson } from "../../../lib/http";

// « Connecter mon calendrier » (Google Calendar): {connected: true | false}. Until the Google API is plugged in, it
// only marks the calendar as connected: the répondeur then offers the next free slots (lib/calendar.ts) and books
// the one the caller picks. The client updates the ElevenLabs agent afterwards (POST /api/agent).
export const POST: APIRoute = handle(async ({ request, locals }) => {
  const b = requireBusiness(locals);
  const body = await readJson(request);
  if (!isRecord(body) || typeof body.connected !== "boolean") throw new HttpError(400, "invalid_body", "Envoyez {connected: true} ou {connected: false}.");
  const business = await db().prepare("UPDATE businesses SET calendar_connected_at = ? WHERE id = ? RETURNING *")
    .bind(body.connected ? Math.floor(Date.now() / 1000) : null, b.id).first<Business>();
  return json({ business });
});
