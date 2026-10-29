import type { APIRoute } from "astro";
import { isLeadStatus } from "../../../lib/business";
import { db } from "../../../lib/db";
import { requireBusiness } from "../../../lib/env";
import { handle, json } from "../../../lib/http";

// Leads, newest first; urgent ones first among the "nouveau". Optional ?status=
export const GET: APIRoute = handle(async ({ locals, url }) => {
  const b = requireBusiness(locals);
  const status = url.searchParams.get("status");
  const filter = isLeadStatus(status) ? " AND status = ?" : "";
  const { results } = await db().prepare(
    `SELECT id, call_id, name, phone, address, need, urgency, status, created_at FROM leads
     WHERE business_id = ?${filter} ORDER BY created_at DESC LIMIT 500`,
  ).bind(...(filter ? [b.id, status] : [b.id])).all();
  return json({ leads: results });
});
