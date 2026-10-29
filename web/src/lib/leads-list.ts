// Data for the « Appels » list (/app). Ordering and grouping live in leads-group.ts.
import { db } from "./db";
import type { ListLead } from "./leads-group";

export async function leadsForBusiness(businessId: string, limit = 300): Promise<ListLead[]> {
  const { results } = await db().prepare(
    `SELECT id, name, phone, subject, need, urgency, status, link_token, created_at,
       (SELECT MIN(starts_at) FROM appointments a WHERE a.lead_id = leads.id) AS appointment_at
     FROM leads WHERE business_id = ? ORDER BY created_at DESC LIMIT ?`,
  ).bind(businessId, limit).all<ListLead>();
  return results ?? [];
}

// Red count in the desktop sidebar: « Urgence » clients not called back yet
export async function urgentToCallBackCount(businessId: string): Promise<number> {
  const row = await db().prepare(
    "SELECT COUNT(*) AS n FROM leads l WHERE business_id = ? AND status = 'nouveau' AND urgency = 'urgence' AND NOT EXISTS (SELECT 1 FROM appointments a WHERE a.lead_id = l.id)",
  ).bind(businessId).first<{ n: number }>();
  return row?.n ?? 0;
}
