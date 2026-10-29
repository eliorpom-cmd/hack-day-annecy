import type { APIRoute } from "astro";
import { validateHours, type Hour } from "../../../lib/business";
import { db } from "../../../lib/db";
import { requireBusiness } from "../../../lib/env";
import { handle, HttpError, isRecord, json, readJson } from "../../../lib/http";

async function loadHours(businessId: string): Promise<Hour[]> {
  const { results } = await db().prepare("SELECT weekday, opens, closes FROM business_hours WHERE business_id = ? ORDER BY weekday, opens")
    .bind(businessId).all<Hour>();
  return results;
}

export const GET: APIRoute = handle(async ({ locals }) => json({ hours: await loadHours(requireBusiness(locals).id) }));

// Replaces all working hours. Accepts [{weekday, opens, closes}] or {hours: [...]}
export const PUT: APIRoute = handle(async ({ request, locals }) => {
  const business = requireBusiness(locals);
  const body = await readJson<unknown>(request);
  const parsed = validateHours(isRecord(body) ? body.hours : body);
  if (!parsed.ok) throw new HttpError(400, "invalid_hours", parsed.hint);
  await db().batch([
    db().prepare("DELETE FROM business_hours WHERE business_id = ?").bind(business.id),
    ...parsed.value.map((h) => db().prepare("INSERT INTO business_hours (business_id, weekday, opens, closes) VALUES (?, ?, ?, ?)")
      .bind(business.id, h.weekday, h.opens, h.closes)),
  ]);
  return json({ hours: await loadHours(business.id) });
});
