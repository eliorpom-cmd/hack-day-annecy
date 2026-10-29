import type { APIRoute } from "astro";
import { isLeadStatus, LEAD_STATUSES } from "../../../lib/business";
import { db } from "../../../lib/db";
import { requireBusiness } from "../../../lib/env";
import { handle, HttpError, json, readJson } from "../../../lib/http";

// Moves a lead along the pipeline; scoped to the session's business
export const PATCH: APIRoute = handle(async ({ request, locals, params }) => {
  const b = requireBusiness(locals);
  const body = await readJson<{ status?: unknown }>(request);
  if (!isLeadStatus(body?.status)) throw new HttpError(400, "invalid_status", `Statut inconnu. Valeurs possibles : ${LEAD_STATUSES.join(", ")}.`);
  const lead = await db().prepare(
    "UPDATE leads SET status = ? WHERE id = ? AND business_id = ? RETURNING id, call_id, name, phone, address, need, urgency, status, created_at",
  ).bind(body.status, params.id ?? "", b.id).first();
  if (!lead) throw new HttpError(404, "not_found", "Ce contact n'existe pas ou n'appartient pas à votre entreprise.");
  return json({ lead });
});
