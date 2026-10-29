// Data for the « Appels » list (/app). Ordering and grouping live in leads-group.ts.
import { db } from "./db";
import type { ListLead } from "./leads-group";

export async function leadsForBusiness(businessId: string, limit = 300): Promise<ListLead[]> {
  const { results } = await db().prepare(
    `SELECT id, name, phone, subject, need, urgency, status, link_token, created_at
     FROM leads WHERE business_id = ? ORDER BY created_at DESC LIMIT ?`,
  ).bind(businessId, limit).all<ListLead>();
  return results ?? [];
}
