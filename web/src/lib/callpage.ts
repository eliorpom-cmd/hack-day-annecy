import { db } from "./db";

export type CallPage = {
  lead_id: string; subject: string | null; name: string | null; phone: string | null; address: string | null; need: string | null;
  urgency: "urgence" | "urgent" | "normal"; urgency_reason: string | null; status: string;
  recall_started_at: number | null; called_back_at: number | null; created_at: number;
  summary: string | null; transcript: string | null; business_name: string;
};

// Public page opened from the WhatsApp/SMS link: the secret token is the only key
export async function callPageByToken(token: string): Promise<CallPage | null> {
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(token)) return null;
  return db().prepare(
    `SELECT l.id AS lead_id, l.subject, l.name, l.phone, l.address, l.need, l.urgency, l.urgency_reason, l.status,
            l.recall_started_at, l.called_back_at, l.created_at, c.summary, c.transcript, b.name AS business_name
     FROM leads l LEFT JOIN calls c ON c.id = l.call_id JOIN businesses b ON b.id = l.business_id
     WHERE l.link_token = ?`,
  ).bind(token).first<CallPage>();
}

// « il y a 12 min », « il y a 3 h », « hier », « il y a 4 jours »
export function timeAgo(unixSeconds: number, now = Date.now() / 1000): string {
  const s = Math.max(0, now - unixSeconds);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  if (s < 2 * 86400) return "hier";
  return `il y a ${Math.floor(s / 86400)} jours`;
}

// First letter upper-case, the rest untouched (« fuite d'eau » -> « Fuite d'eau »)
export const capitalize = (s: string) => (s ? s[0].toLocaleUpperCase("fr-FR") + s.slice(1) : s);
