import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { businessProfileSchema, type BusinessProfile } from "@/lib/business/schema";
import { AppError } from "@/lib/server/errors.server";

export type Db = SupabaseClient<Database>;

export function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "business"
  );
}

/** Resolve the caller's organization from the session — never from client input. */
export async function requireOrg(db: Db, userId: string) {
  const { data: membership, error } = await db
    .from("organization_members")
    .select("organization_id, role, organizations(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new AppError("We couldn't load your account.", { cause: error });
  if (!membership?.organizations)
    throw new AppError("No organization found for this account.", { status: 404 });
  return { org: membership.organizations, role: membership.role };
}

export async function ensureOrganization(db: Db, userId: string, claims: Record<string, unknown>) {
  const email = typeof claims.email === "string" ? claims.email : null;
  const meta = (claims.user_metadata ?? {}) as Record<string, unknown>;
  const name = (meta.full_name as string) || (meta.name as string) || null;
  const avatar = (meta.avatar_url as string) || (meta.picture as string) || null;

  await db
    .from("profiles")
    .upsert({ id: userId, email, name, avatar_url: avatar }, { onConflict: "id" });

  const { data: existing } = await db
    .from("organization_members")
    .select("organization_id, organizations(*)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (existing?.organizations) return { org: existing.organizations, isNew: false };

  const base = slugify(
    name ? `${name.split(" ")[0]}s business` : email?.split("@")[0] || "business",
  );
  const slug = `${base}-${crypto.randomUUID().slice(0, 6)}`;
  const trialEnds = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();
  const { data: org, error } = await db
    .from("organizations")
    .insert({
      owner_id: userId,
      name: name ? `${name}'s business` : "My business",
      slug,
      trial_ends_at: trialEnds,
    })
    .select("*")
    .single();
  if (error || !org) throw new AppError("We couldn't create your workspace.", { cause: error });
  const { error: mErr } = await db
    .from("organization_members")
    .insert({ organization_id: org.id, user_id: userId, role: "owner" });
  if (mErr) throw new AppError("We couldn't finish setting up your workspace.", { cause: mErr });
  return { org, isNew: true };
}

/** Load the full business profile (profile + hours + services + faqs + staff). */
export async function loadBusinessProfile(db: Db, orgId: string): Promise<BusinessProfile | null> {
  const [{ data: bp }, { data: hours }, { data: services }, { data: faqs }, { data: staff }] =
    await Promise.all([
      db.from("business_profiles").select("*").eq("organization_id", orgId).maybeSingle(),
      db.from("business_hours").select("*").eq("organization_id", orgId).order("day_of_week"),
      db
        .from("services")
        .select("*")
        .eq("organization_id", orgId)
        .eq("active", true)
        .order("sort_order"),
      db.from("faqs").select("*").eq("organization_id", orgId).order("sort_order"),
      db
        .from("staff")
        .select("*")
        .eq("organization_id", orgId)
        .eq("active", true)
        .order("created_at"),
    ]);
  if (!bp) return null;
  return businessProfileSchema.parse({
    business_name: bp.business_name,
    industry: bp.industry,
    description: bp.description,
    address: bp.address,
    city: bp.city,
    state: bp.state,
    postal_code: bp.postal_code,
    country: bp.country,
    phone: bp.phone,
    email: bp.email,
    website: bp.website,
    timezone: bp.timezone,
    booking_url: bp.booking_url,
    policies: bp.policies,
    booking_rules: bp.booking_rules,
    cancellation_rules: bp.cancellation_rules,
    transfer_rules: bp.transfer_rules,
    emergency_rules: bp.emergency_rules,
    hours: (hours ?? []).map((h) => ({
      day_of_week: h.day_of_week,
      enabled: h.enabled,
      open_time: h.open_time.slice(0, 5),
      close_time: h.close_time.slice(0, 5),
    })),
    services: (services ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      duration_minutes: s.duration_minutes,
      price: s.price == null ? null : Number(s.price),
      price_note: s.price_note,
    })),
    faqs: (faqs ?? []).map((f) => ({ id: f.id, question: f.question, answer: f.answer })),
    staff: (staff ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      email: s.email,
      phone: s.phone,
    })),
  });
}

/** Persist a full business profile (replace-all semantics for child lists). */
export async function saveBusinessProfile(db: Db, orgId: string, input: BusinessProfile) {
  const { hours, services, faqs, staff, ...profile } = input;
  const { error } = await db
    .from("business_profiles")
    .upsert(
      { ...profile, organization_id: orgId, timezone: profile.timezone ?? "America/New_York" },
      { onConflict: "organization_id" },
    );
  if (error) throw new AppError("We couldn't save your business details.", { cause: error });

  await db.from("business_hours").delete().eq("organization_id", orgId);
  if (hours.length) {
    const { error: hErr } = await db
      .from("business_hours")
      .insert(hours.map((h) => ({ ...h, organization_id: orgId })));
    if (hErr) throw new AppError("We couldn't save your opening hours.", { cause: hErr });
  }
  await db.from("services").delete().eq("organization_id", orgId);
  if (services.length) {
    const { error: sErr } = await db.from("services").insert(
      services.map((s, i) => ({
        organization_id: orgId,
        name: s.name,
        description: s.description ?? null,
        duration_minutes: s.duration_minutes ?? null,
        price: s.price ?? null,
        price_note: s.price_note ?? null,
        sort_order: i,
      })),
    );
    if (sErr) throw new AppError("We couldn't save your services.", { cause: sErr });
  }
  await db.from("faqs").delete().eq("organization_id", orgId);
  if (faqs.length) {
    const { error: fErr } = await db.from("faqs").insert(
      faqs.map((f, i) => ({
        organization_id: orgId,
        question: f.question,
        answer: f.answer,
        sort_order: i,
      })),
    );
    if (fErr) throw new AppError("We couldn't save your FAQs.", { cause: fErr });
  }
  await db.from("staff").delete().eq("organization_id", orgId);
  if (staff.length) {
    const { error: stErr } = await db.from("staff").insert(
      staff.map((s) => ({
        organization_id: orgId,
        name: s.name,
        role: s.role ?? null,
        email: s.email ?? null,
        phone: s.phone ?? null,
      })),
    );
    if (stErr) throw new AppError("We couldn't save your team.", { cause: stErr });
  }
  await db
    .from("organizations")
    .update({
      name: profile.business_name,
      industry: profile.industry ?? null,
      timezone: profile.timezone ?? "America/New_York",
    })
    .eq("id", orgId);
}

export async function audit(
  db: Db,
  orgId: string,
  userId: string,
  action: string,
  resource?: { type: string; id: string },
  metadata: Record<string, unknown> = {},
) {
  await db.from("audit_logs").insert({
    organization_id: orgId,
    user_id: userId,
    action,
    resource_type: resource?.type ?? null,
    resource_id: resource?.id ?? null,
    metadata: metadata as never,
  });
}
