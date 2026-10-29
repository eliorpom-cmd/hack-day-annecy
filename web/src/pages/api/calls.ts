import type { APIRoute } from "astro";
import { db } from "../../lib/db";
import { requireBusiness } from "../../lib/env";
import { handle, json } from "../../lib/http";

type CallRow = {
  id: string; from_number: string | null; handled_by: string; urgency: string; duration_s: number | null;
  summary: string | null; transcript: string | null; started_at: number; lead_id: string | null; lead_name: string | null;
};

// Recent calls first. ?limit= (default 50, max 200)
export const GET: APIRoute = handle(async ({ locals, url }) => {
  const b = requireBusiness(locals);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 50));
  const { results } = await db().prepare(
    `SELECT c.id, c.from_number, c.handled_by, c.urgency, c.duration_s, c.summary, c.transcript, c.started_at,
            l.id AS lead_id, l.name AS lead_name
     FROM calls c LEFT JOIN leads l ON l.call_id = c.id AND l.business_id = c.business_id
     WHERE c.business_id = ? ORDER BY c.started_at DESC LIMIT ?`,
  ).bind(b.id, limit).all<CallRow>();
  const calls = results.map((c) => {
    let transcript: unknown = null;
    try { transcript = c.transcript ? JSON.parse(c.transcript) : null; } catch { transcript = c.transcript; }
    return { ...c, transcript };
  });
  return json({ calls });
});
