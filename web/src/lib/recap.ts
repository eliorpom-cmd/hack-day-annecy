// Weekly recap e-mail: one message per business with an onboarded owner, sent by the cron.
import { env } from "cloudflare:workers";
import { db } from "./db";
import { businessDisplayName } from "./greeting";
import { buildRecap, type RecapContent, type RecapLead } from "./recap-format";

const WEEK_SECONDS = 7 * 86400;

type BusinessRow = { id: string; name: string; first_name: string; last_name: string; trade: string; email: string };

// Reads the counters and the new leads of the last 7 days for one business
async function loadRecapInput(businessId: string, businessName: string, nowSec: number) {
  const since = nowSec - WEEK_SECONDS;
  const stats = await db()
    .prepare(
      `SELECT COUNT(*) AS calls,
              SUM(CASE WHEN handled_by = 'agent' THEN 1 ELSE 0 END) AS handled,
              SUM(CASE WHEN urgency = 'urgence' THEN 1 ELSE 0 END) AS urgent
         FROM calls WHERE business_id = ? AND started_at >= ?`,
    )
    .bind(businessId, since)
    .first<{ calls: number; handled: number | null; urgent: number | null }>();

  const leads = await db()
    .prepare(
      `SELECT name, phone, need, urgency, status FROM leads
        WHERE business_id = ? AND created_at >= ? ORDER BY created_at DESC`,
    )
    .bind(businessId, since)
    .all<RecapLead>();

  return {
    businessName,
    weekStart: new Date(since * 1000),
    calls: stats?.calls ?? 0,
    handledByAgent: stats?.handled ?? 0,
    urgent: stats?.urgent ?? 0,
    leads: leads.results ?? [],
  };
}

// Builds the recap of one business for the last 7 days; null when the business does not exist
export async function recapPreview(businessId: string): Promise<RecapContent | null> {
  const row = await db()
    .prepare("SELECT name, first_name, last_name, trade FROM businesses WHERE id = ?")
    .bind(businessId)
    .first<{ name: string; first_name: string; last_name: string; trade: string }>();
  if (!row) return null;
  const input = await loadRecapInput(businessId, businessDisplayName(row), Math.floor(Date.now() / 1000));
  return buildRecap(input);
}

// Sends the recap to every onboarded business that had activity in the last 7 days.
// Never throws for one business: each failure is logged and the loop goes on.
export async function sendWeeklyRecaps(): Promise<void> {
  const key = (env as unknown as Record<string, string | undefined>).RESEND_API_KEY;
  if (!key) {
    console.log(JSON.stringify({ event: "recap.skipped", reason: "RESEND_API_KEY missing" }));
    return;
  }
  const from = (env as unknown as Record<string, string | undefined>).MAIL_FROM ?? "onboarding@resend.dev";

  let businesses: BusinessRow[];
  try {
    const res = await db()
      .prepare(
        `SELECT b.id, b.name, b.first_name, b.last_name, b.trade, u.email FROM businesses b
           JOIN users u ON u.id = b.owner_id
          WHERE b.onboarding_step = 'done'`,
      )
      .all<BusinessRow>();
    businesses = res.results ?? [];
  } catch (err) {
    console.log(JSON.stringify({ event: "recap.failed", error: String(err) }));
    return;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  for (const business of businesses) {
    try {
      const input = await loadRecapInput(business.id, businessDisplayName(business), nowSec);
      if (input.calls === 0 && input.leads.length === 0) {
        console.log(JSON.stringify({ event: "recap.empty", businessId: business.id }));
        continue;
      }
      const mail = buildRecap(input);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: business.email,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        }),
      });
      if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
      console.log(JSON.stringify({ event: "recap.sent", businessId: business.id }));
    } catch (err) {
      console.log(JSON.stringify({ event: "recap.failed", businessId: business.id, error: String(err) }));
    }
  }
}
