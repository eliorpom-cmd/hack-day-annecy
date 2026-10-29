import type { APIRoute } from "astro";
import { db } from "../../lib/db";
import { requireBusiness } from "../../lib/env";
import { handle, json } from "../../lib/http";
import { nowSeconds } from "../../lib/tokens";

// Dashboard counters over the last ?days= (default 7, max 365)
export const GET: APIRoute = handle(async ({ locals, url }) => {
  const b = requireBusiness(locals);
  const days = Math.min(365, Math.max(1, Math.floor(Number(url.searchParams.get("days")) || 7)));
  const since = nowSeconds() - days * 86400;
  const [calls, leads] = await Promise.all([
    db().prepare(
      `SELECT COUNT(*) AS calls,
              COALESCE(SUM(handled_by = 'agent'), 0) AS handled_by_agent,
              COALESCE(SUM(urgency IN ('urgence', 'urgent')), 0) AS urgent
       FROM calls WHERE business_id = ? AND started_at >= ?`,
    ).bind(b.id, since).first<{ calls: number; handled_by_agent: number; urgent: number }>(),
    db().prepare("SELECT COUNT(*) AS leads FROM leads WHERE business_id = ? AND created_at >= ?").bind(b.id, since).first<{ leads: number }>(),
  ]);
  const handled = calls?.handled_by_agent ?? 0;
  // missed_saved: name used in PROJET.md's contract, same value as handled_by_agent
  return json({ days, calls: calls?.calls ?? 0, handled_by_agent: handled, missed_saved: handled, urgent: calls?.urgent ?? 0, leads: leads?.leads ?? 0 });
});
