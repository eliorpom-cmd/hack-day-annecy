import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Ensure the signed-in user has a profile + organization. Called right after sign-in. */
export const ensureOrganizationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { ensureOrganization } = await import("./org.server");
    const { org, isNew } = await ensureOrganization(context.supabase, context.userId, context.claims as Record<string, unknown>);
    return { organization: org, isNew };
  });

/** Everything the app shell needs: org, plan, receptionists, business profile summary. */
export const getWorkspaceFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireOrg } = await import("./org.server");
    const db = context.supabase;
    const { org, role } = await requireOrg(db, context.userId);
    const [{ data: receptionists }, { data: plan }, { data: profile }, { data: bp }, { data: subscription }] = await Promise.all([
      db
        .from("receptionists")
        .select("id, name, status, status_message, language, greeting, elevenlabs_agent_id, created_at, voices(name)")
        .eq("organization_id", org.id)
        .order("created_at"),
      db.from("plans").select("*").eq("id", org.plan_id).maybeSingle(),
      db.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
      db.from("business_profiles").select("business_name, industry, website, phone").eq("organization_id", org.id).maybeSingle(),
      db
        .from("subscriptions")
        .select("id, status, price_id, current_period_end, cancel_at_period_end")
        .eq("organization_id", org.id)
        .in("status", ["active", "trialing", "past_due"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    const { getUsage } = await import("@/lib/billing/usage.server");
    const [usage, { data: isAdmin }] = await Promise.all([
      getUsage(db, org.id).catch(() => null),
      db.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    ]);
    const trialDaysLeft = org.trial_ends_at
      ? Math.max(0, Math.ceil((new Date(org.trial_ends_at).getTime() - Date.now()) / 86400000))
      : null;
    return {
      organization: org,
      role,
      plan,
      profile,
      business: bp,
      receptionists: (receptionists ?? []).map((r) => ({
        ...r,
        voice_name: (r.voices as { name: string } | null)?.name ?? null,
        voices: undefined,
      })),
      trialDaysLeft,
      subscription: subscription ?? null,
      usage,
      isAdmin: !!isAdmin,
    };
  });

const setOnboardingStepSchema = z.object({
  step: z.enum(["business", "receptionist", "test", "phone", "live"]),
});

/** Persist the onboarding wizard's current step so users can resume later. */
export const setOnboardingStepFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => setOnboardingStepSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { requireOrg } = await import("./org.server");
    const { org } = await requireOrg(context.supabase, context.userId);
    await context.supabase.from("organizations").update({ onboarding_step: data.step }).eq("id", org.id);
    return { ok: true };
  });

/** Mark onboarding as finished. Called from the last onboarding step. */
export const completeOnboardingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireOrg } = await import("./org.server");
    const { org } = await requireOrg(context.supabase, context.userId);
    await context.supabase.from("organizations").update({ onboarding_completed: true, onboarding_step: "live" }).eq("id", org.id);
    return { ok: true };
  });

const updateOrganizationSchema = z.object({ name: z.string().min(2).max(120) });

/** Rename the organization. Owners and admins only. */
export const updateOrganizationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateOrganizationSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { requireOrg, audit } = await import("./org.server");
    const { AppError } = await import("@/lib/server/errors.server");
    const { org, role } = await requireOrg(context.supabase, context.userId);
    if (role !== "owner" && role !== "admin") {
      throw new AppError("Only owners and admins can rename the business.", { status: 403 });
    }
    const { error } = await context.supabase.from("organizations").update({ name: data.name }).eq("id", org.id);
    if (error) throw new AppError("We couldn't save that name.", { cause: error });
    await audit(context.supabase, org.id, context.userId, "organization.renamed");
    return { ok: true };
  });

const updateProfileSchema = z.object({ name: z.string().min(1).max(120) });

/** Update the signed-in user's display name. */
export const updateProfileFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateProfileSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { AppError } = await import("@/lib/server/errors.server");
    const { error } = await context.supabase.from("profiles").update({ name: data.name }).eq("id", context.userId);
    if (error) throw new AppError("We couldn't save your profile.", { cause: error });
    return { ok: true };
  });
