import type { APIRoute } from "astro";
import { db, type Business } from "../../../lib/db";
import { requireBusiness } from "../../../lib/env";
import { isProfileState } from "../../../lib/google-profile";
import { handle, HttpError, isRecord, json, readJson } from "../../../lib/http";

// « J'ai une fiche Google » ({state: "connected"}, test data for now), « Je n'en ai pas » ({state: "none"}, creation
// guide) or back to the choice ({state: null})
export const PUT: APIRoute = handle(async ({ request, locals }) => {
  const b = requireBusiness(locals);
  const body = await readJson(request);
  const state = isRecord(body) ? body.state : undefined;
  if (state !== null && !isProfileState(state)) throw new HttpError(400, "invalid_state", "Choisissez « J’ai une fiche » ou « Je n’ai pas de fiche ».");
  const business = await db().prepare("UPDATE businesses SET google_profile = ? WHERE id = ? RETURNING *").bind(state, b.id).first<Business>();
  return json({ business });
});
