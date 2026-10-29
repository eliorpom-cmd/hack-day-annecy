import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AnyDb = SupabaseClient<Database>;

/** Calls stop being answered once usage passes this multiple of the plan's included minutes. */
export const SAFETY_CAP_MULTIPLIER = 3;
const ACTIVE = ["active", "trialing", "past_due"];

export interface UsageSummary {
  planId: string;
  paid: boolean;
  periodStart: string;
  periodEnd: string | null;
  minutesUsed: number;
  includedMinutes: number;
  overageMinutes: number;
  overageRate: number;
  overageCost: number;
  percent: number;
  level: "ok" | "warning" | "over" | "blocked";
  safetyCapMinutes: number;
}

function startOfMonthUtc() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

export async function getUsage(db: AnyDb, orgId: string): Promise<UsageSummary> {
  const { data: org } = await db.from("organizations").select("plan_id").eq("id", orgId).maybeSingle();
  const planId = org?.plan_id ?? "free";
  const [{ data: plan }, { data: sub }] = await Promise.all([
    db.from("plans").select("included_minutes, overage_price_per_minute").eq("id", planId).maybeSingle(),
    db
      .from("subscriptions")
      .select("current_period_start, current_period_end, status")
      .eq("organization_id", orgId)
      .in("status", ACTIVE)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const periodStart = sub?.current_period_start ?? startOfMonthUtc();
  const { data: calls } = await db
    .from("calls")
    .select("duration_secs")
    .eq("organization_id", orgId)
    .eq("channel", "phone")
    .gte("started_at", periodStart);
  const minutesUsed = (calls ?? []).reduce((s, c) => s + Math.ceil((c.duration_secs ?? 0) / 60), 0);
  const includedMinutes = plan?.included_minutes ?? 0;
  const overageRate = Number(plan?.overage_price_per_minute ?? 0);
  const overageMinutes = Math.max(0, minutesUsed - includedMinutes);
  const paid = !!sub && planId !== "free";
  const safetyCapMinutes = includedMinutes * SAFETY_CAP_MULTIPLIER;
  const percent = includedMinutes > 0 ? Math.round((minutesUsed / includedMinutes) * 100) : 0;
  const level: UsageSummary["level"] = !paid
    ? "blocked"
    : minutesUsed >= safetyCapMinutes
      ? "blocked"
      : minutesUsed >= includedMinutes
        ? "over"
        : percent >= 80
          ? "warning"
          : "ok";
  return {
    planId,
    paid,
    periodStart,
    periodEnd: sub?.current_period_end ?? null,
    minutesUsed,
    includedMinutes,
    overageMinutes,
    overageRate,
    overageCost: Math.round(overageMinutes * overageRate * 100) / 100,
    percent,
    level,
    safetyCapMinutes,
  };
}

/**
 * Bill any not-yet-billed overage minutes as pending Stripe invoice items;
 * they are added to the customer's next subscription invoice automatically.
 * Idempotent: each charge claims a unique (org, period, billed-through) row first.
 */
export async function chargeOverage(orgId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as AnyDb;
  const usage = await getUsage(db, orgId);
  if (!usage.paid || usage.overageMinutes <= 0 || usage.overageRate <= 0) return { charged: 0 };

  const { data: prior } = await db
    .from("usage_overage_charges")
    .select("billed_through_minutes")
    .eq("organization_id", orgId)
    .eq("period_start", usage.periodStart)
    .neq("status", "failed")
    .order("billed_through_minutes", { ascending: false })
    .limit(1)
    .maybeSingle();
  const alreadyBilled = prior?.billed_through_minutes ?? 0;
  const minutes = usage.overageMinutes - alreadyBilled;
  if (minutes <= 0) return { charged: 0 };
  const amountCents = Math.round(minutes * usage.overageRate * 100);

  const { data: claim, error: claimErr } = await db
    .from("usage_overage_charges")
    .insert({
      organization_id: orgId,
      period_start: usage.periodStart,
      billed_through_minutes: usage.overageMinutes,
      minutes,
      amount_cents: amountCents,
    })
    .select("id")
    .single();
  if (claimErr || !claim) return { charged: 0 }; // another run already claimed it

  const { data: sub } = await db
    .from("subscriptions")
    .select("stripe_customer_id, stripe_subscription_id, environment")
    .eq("organization_id", orgId)
    .in("status", ACTIVE)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  try {
    if (!sub) throw new Error("no active subscription");
    const { createStripeClient } = await import("@/lib/stripe.server");
    const stripe = createStripeClient(sub.environment as "sandbox" | "live");
    const item = await stripe.invoiceItems.create(
      {
        customer: sub.stripe_customer_id,
        subscription: sub.stripe_subscription_id,
        amount: amountCents,
        currency: "usd",
        description: `Extra call minutes: ${minutes} min × $${usage.overageRate.toFixed(2)}`,
      },
      { idempotencyKey: `overage-${claim.id}` },
    );
    await db.from("usage_overage_charges").update({ status: "billed", stripe_invoice_item_id: item.id }).eq("id", claim.id);
    console.log(JSON.stringify({ level: "info", event: "usage.overage_billed", org_id: orgId, minutes, amount_cents: amountCents }));
    return { charged: minutes };
  } catch (e) {
    await db.from("usage_overage_charges").update({ status: "failed" }).eq("id", claim.id);
    console.error(JSON.stringify({ level: "error", event: "usage.overage_failed", org_id: orgId, error: String(e) }));
    return { charged: 0 };
  }
}
