import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Response("Forbidden", { status: 403 });
}

export const getAdminOverviewFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { getUsage } = await import("@/lib/billing/usage.server");
    const monthStart = new Date(
      Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
    ).toISOString();

    const [orgs, members, profiles, subs, recs, nums, plans, calls, logs, overage] =
      await Promise.all([
        db
          .from("organizations")
          .select("id, name, plan_id, created_at, trial_ends_at")
          .order("created_at", { ascending: false }),
        db
          .from("organization_members")
          .select("organization_id, user_id, role")
          .eq("role", "owner"),
        db.from("profiles").select("id, email, name"),
        db
          .from("subscriptions")
          .select("organization_id, status, price_id, current_period_end, cancel_at_period_end")
          .in("status", ["active", "trialing", "past_due"]),
        db
          .from("receptionists")
          .select("id, organization_id, name, status, status_message, updated_at"),
        db
          .from("phone_numbers")
          .select("id, organization_id, phone_number, status, status_message, updated_at"),
        db.from("plans").select("id, name, monthly_price, annual_price"),
        db
          .from("calls")
          .select("organization_id, duration_secs, channel")
          .gte("started_at", monthStart),
        db
          .from("audit_logs")
          .select("id, organization_id, action, resource_type, created_at")
          .order("created_at", { ascending: false })
          .limit(30),
        db
          .from("usage_overage_charges")
          .select("organization_id, amount_cents, status, created_at")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

    const emailById = new Map((profiles.data ?? []).map((p) => [p.id, p.email]));
    const ownerByOrg = new Map(
      (members.data ?? []).map((m) => [m.organization_id, emailById.get(m.user_id) ?? null]),
    );
    const subByOrg = new Map((subs.data ?? []).map((s) => [s.organization_id, s]));
    const planById = new Map((plans.data ?? []).map((p) => [p.id, p]));

    let mrr = 0;
    for (const s of subs.data ?? []) {
      const planId = s.price_id.split("_")[0] ?? "";
      const p = planById.get(planId);
      if (!p) continue;
      mrr += s.price_id.endsWith("yearly") ? Number(p.annual_price) / 12 : Number(p.monthly_price);
    }

    const phoneMinutes = (calls.data ?? [])
      .filter((c) => c.channel === "phone")
      .reduce((s, c) => s + Math.ceil(c.duration_secs / 60), 0);

    const customers = await Promise.all(
      (orgs.data ?? []).map(async (o) => {
        const orgRecs = (recs.data ?? []).filter((r) => r.organization_id === o.id);
        const orgNums = (nums.data ?? []).filter((n) => n.organization_id === o.id);
        const sub = subByOrg.get(o.id);
        const usage = sub ? await getUsage(db as never, o.id).catch(() => null) : null;
        return {
          id: o.id,
          name: o.name,
          owner: ownerByOrg.get(o.id) ?? null,
          plan: planById.get(o.plan_id)?.name ?? o.plan_id,
          subscription: sub ? sub.status + (sub.cancel_at_period_end ? " (cancelling)" : "") : null,
          createdAt: o.created_at,
          receptionists: orgRecs.length,
          suspended: orgRecs.length > 0 && orgRecs.every((r) => r.status === "suspended"),
          liveNumbers: orgNums.filter((n) => n.status === "live").map((n) => n.phone_number),
          minutesUsed: usage?.minutesUsed ?? null,
          includedMinutes: usage?.includedMinutes ?? null,
        };
      }),
    );

    const orgName = new Map((orgs.data ?? []).map((o) => [o.id, o.name]));
    const failed = [
      ...(recs.data ?? [])
        .filter((r) => r.status === "error")
        .map((r) => ({
          kind: "receptionist" as const,
          id: r.id,
          org: orgName.get(r.organization_id) ?? "",
          label: r.name,
          message: r.status_message,
          at: r.updated_at,
        })),
      ...(nums.data ?? [])
        .filter((n) => n.status !== "live" && n.status !== "released")
        .map((n) => ({
          kind: "phone" as const,
          id: n.id,
          org: orgName.get(n.organization_id) ?? "",
          label: n.phone_number,
          message: n.status_message ?? n.status,
          at: n.updated_at,
        })),
    ];

    return {
      stats: {
        organizations: orgs.data?.length ?? 0,
        paying: subs.data?.length ?? 0,
        mrr: Math.round(mrr * 100) / 100,
        liveReceptionists: (recs.data ?? []).filter((r) => r.status === "live").length,
        liveNumbers: (nums.data ?? []).filter((n) => n.status === "live").length,
        callsThisMonth: (calls.data ?? []).filter((c) => c.channel === "phone").length,
        minutesThisMonth: phoneMinutes,
        overageBilled:
          (overage.data ?? [])
            .filter((c) => c.status === "billed")
            .reduce((s, c) => s + c.amount_cents, 0) / 100,
      },
      customers,
      failed,
      logs: (logs.data ?? []).map((l) => ({
        ...l,
        org: l.organization_id ? (orgName.get(l.organization_id) ?? null) : null,
      })),
    };
  });

export const setOrgSuspendedFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ organizationId: z.string().uuid(), suspended: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: recs } = await db
      .from("receptionists")
      .select("id, elevenlabs_agent_id")
      .eq("organization_id", data.organizationId);
    const { data: nums } = await db
      .from("phone_numbers")
      .select("receptionist_id")
      .eq("organization_id", data.organizationId)
      .eq("status", "live");
    const liveRecs = new Set((nums ?? []).map((n) => n.receptionist_id));
    for (const r of recs ?? []) {
      const status = data.suspended
        ? "suspended"
        : liveRecs.has(r.id)
          ? "live"
          : r.elevenlabs_agent_id
            ? "agent_ready"
            : "draft";
      await db
        .from("receptionists")
        .update({ status, status_message: data.suspended ? "Account suspended" : null })
        .eq("id", r.id);
    }
    await db.from("audit_logs").insert({
      organization_id: data.organizationId,
      user_id: context.userId,
      action: data.suspended ? "admin.org_suspended" : "admin.org_unsuspended",
      resource_type: "organization",
      resource_id: data.organizationId,
      metadata: {},
    });
    return { ok: true };
  });

export const retryReceptionistFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ receptionistId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { publishReceptionist } = await import("@/lib/receptionist/receptionist.server");
    try {
      await publishReceptionist(db as never, data.receptionistId);
      return { ok: true as const };
    } catch (e) {
      return {
        ok: false as const,
        error: (e as { userMessage?: string }).userMessage ?? "Retry failed",
      };
    }
  });
