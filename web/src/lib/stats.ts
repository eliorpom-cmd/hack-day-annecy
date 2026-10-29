// Dashboard counters over the last N days, shared by GET /api/stats and the desktop « Appels » page
import { db } from "./db";
import { nowSeconds } from "./tokens";

export type Stats = { days: number; calls: number; handled_by_agent: number; missed_saved: number; urgent: number; leads: number };

export async function statsForBusiness(businessId: string, days = 7): Promise<Stats> {
  const since = nowSeconds() - days * 86400;
  const [calls, leads] = await Promise.all([
    db().prepare(
      `SELECT COUNT(*) AS calls,
              COALESCE(SUM(handled_by = 'agent'), 0) AS handled_by_agent,
              COALESCE(SUM(urgency IN ('urgence', 'urgent')), 0) AS urgent
       FROM calls WHERE business_id = ? AND started_at >= ?`,
    ).bind(businessId, since).first<{ calls: number; handled_by_agent: number; urgent: number }>(),
    db().prepare("SELECT COUNT(*) AS leads FROM leads WHERE business_id = ? AND created_at >= ?").bind(businessId, since).first<{ leads: number }>(),
  ]);
  const handled = calls?.handled_by_agent ?? 0;
  // missed_saved: name used in PROJET.md's contract, same value as handled_by_agent
  return { days, calls: calls?.calls ?? 0, handled_by_agent: handled, missed_saved: handled, urgent: calls?.urgent ?? 0, leads: leads?.leads ?? 0 };
}
