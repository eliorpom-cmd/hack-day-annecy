import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PROJECT_ID = "c55f415b-8636-4273-bce3-382322a9dc14";

/** Twilio must reach a public URL. Map preview/local origins to the stable preview host. */
function publicBaseUrl() {
  const origin = new URL(getRequest().url).origin;
  const host = new URL(origin).hostname;
  if (
    host === "localhost" ||
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host.endsWith(".lovableproject.com")
  ) {
    return `https://project--${PROJECT_ID}-dev.lovable.app`;
  }
  return origin;
}

function voiceUrl() {
  const token = process.env["TWILIO_VOICE_WEBHOOK_TOKEN"];
  if (!token) throw new Error("TWILIO_VOICE_WEBHOOK_TOKEN missing");
  return `${publicBaseUrl()}/api/public/twilio/voice?token=${encodeURIComponent(token)}`;
}

async function loadEntitlement(ctx: { supabase: any; userId: string }) {
  const { requireOrg } = await import("@/lib/org/org.server");
  const { org, role } = await requireOrg(ctx.supabase, ctx.userId);
  const { data: plan } = await ctx.supabase
    .from("plans")
    .select("id, name, included_numbers")
    .eq("id", org.plan_id)
    .maybeSingle();
  return { org, role, plan: plan as { id: string; name: string; included_numbers: number } | null };
}

export const getPhoneOverviewFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { org, plan } = await loadEntitlement(context);
    const { data: numbers } = await context.supabase
      .from("phone_numbers")
      .select(
        "id, phone_number, friendly_name, locality, region, status, status_message, receptionist_id, created_at",
      )
      .eq("organization_id", org.id)
      .neq("status", "released")
      .order("created_at");
    const { data: receptionists } = await context.supabase
      .from("receptionists")
      .select("id, name, status, elevenlabs_agent_id")
      .eq("organization_id", org.id)
      .order("created_at");
    const allowed = plan?.included_numbers ?? 0;
    return {
      planName: plan?.name ?? "Free",
      allowed,
      numbers: numbers ?? [],
      receptionists: (receptionists ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        ready: !!r.elevenlabs_agent_id,
      })),
    };
  });

export const searchNumbersFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        areaCode: z
          .string()
          .regex(/^\d{3}$/)
          .optional(),
        contains: z
          .string()
          .regex(/^[0-9]{2,7}$/)
          .optional(),
        region: z
          .string()
          .regex(/^[A-Z]{2}$/)
          .optional(),
        type: z.enum(["local", "toll_free"]).default("local"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { plan } = await loadEntitlement(context);
    if (!plan || plan.included_numbers < 1) return { error: "upgrade" as const, numbers: [] };
    const { twilioProvider } = await import("./twilio.server");
    const { AppError } = await import("@/lib/server/errors.server");
    try {
      return { error: null, numbers: await twilioProvider.searchNumbers(data) };
    } catch (e) {
      const err =
        e instanceof AppError
          ? e
          : new AppError("We couldn't search numbers right now.", { cause: e });
      return { error: `${err.userMessage} (ref ${err.errorId})`, numbers: [] };
    }
  });

export const claimNumberFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ phoneNumber: z.string().regex(/^\+1\d{10}$/), receptionistId: z.string().uuid() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { org, role, plan } = await loadEntitlement(context);
    if (role === "member") return { error: "Only workspace owners and admins can add numbers." };
    if (!plan || plan.included_numbers < 1)
      return { error: "Phone numbers are included on paid plans. Upgrade to get one." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { audit } = await import("@/lib/org/org.server");
    const { AppError, log } = await import("@/lib/server/errors.server");
    const { twilioProvider } = await import("./twilio.server");

    const { count } = await supabaseAdmin
      .from("phone_numbers")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org.id)
      .neq("status", "released");
    if ((count ?? 0) >= plan.included_numbers) {
      return {
        error: `Your ${plan.name} plan includes ${plan.included_numbers} number. Release your current number to pick a new one.`,
      };
    }

    const { data: rec } = await context.supabase
      .from("receptionists")
      .select("id, name, elevenlabs_agent_id, status")
      .eq("id", data.receptionistId)
      .eq("organization_id", org.id)
      .maybeSingle();
    if (!rec?.elevenlabs_agent_id)
      return { error: "Finish setting up this receptionist before adding a number." };

    const { data: row, error: insErr } = await supabaseAdmin
      .from("phone_numbers")
      .insert({
        organization_id: org.id,
        receptionist_id: rec.id,
        phone_number: data.phoneNumber,
        status: "provisioning",
      })
      .select("id")
      .single();
    if (insErr || !row) return { error: "That number was just taken. Please pick another." };
    await supabaseAdmin
      .from("receptionists")
      .update({ status: "phone_provisioning" })
      .eq("id", rec.id);

    try {
      const url = voiceUrl();
      const bought = await twilioProvider.purchaseNumber({
        phoneNumber: data.phoneNumber,
        voiceUrl: url,
        label: `${org.name} — ${rec.name}`,
      });
      await supabaseAdmin
        .from("phone_numbers")
        .update({ provider_number_sid: bought.sid, status: "configuring" })
        .eq("id", row.id);
      await supabaseAdmin
        .from("receptionists")
        .update({ status: "phone_configuring" })
        .eq("id", rec.id);

      // Only mark LIVE once the provider confirms calls are routed to us.
      const routed =
        bought.voiceUrl === url || (await twilioProvider.configureNumber(bought.sid, url));
      if (!routed)
        throw new AppError("The number was bought but call routing couldn't be confirmed.");

      await supabaseAdmin
        .from("phone_numbers")
        .update({ status: "live", status_message: null })
        .eq("id", row.id);
      await supabaseAdmin
        .from("receptionists")
        .update({ status: "live", status_message: null })
        .eq("id", rec.id);
      await audit(context.supabase, org.id, context.userId, "phone.claimed", {
        type: "phone_number",
        id: row.id,
      }).catch(() => {});
      log("phone.claimed", { org_id: org.id, number_id: row.id });
      return { error: null, id: row.id };
    } catch (e) {
      const err =
        e instanceof AppError ? e : new AppError("We couldn't set up that number.", { cause: e });
      await supabaseAdmin
        .from("phone_numbers")
        .update({ status: "error", status_message: `${err.userMessage} (ref ${err.errorId})` })
        .eq("id", row.id);
      await supabaseAdmin.from("receptionists").update({ status: "agent_ready" }).eq("id", rec.id);
      return { error: `${err.userMessage} (ref ${err.errorId})` };
    }
  });

export const releaseNumberFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { org, role } = await loadEntitlement(context);
    if (role === "member")
      return { error: "Only workspace owners and admins can release numbers." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { twilioProvider } = await import("./twilio.server");
    const { AppError } = await import("@/lib/server/errors.server");
    const { data: num } = await supabaseAdmin
      .from("phone_numbers")
      .select("id, provider_number_sid, receptionist_id")
      .eq("id", data.id)
      .eq("organization_id", org.id)
      .maybeSingle();
    if (!num) return { error: "Number not found." };
    try {
      if (num.provider_number_sid) await twilioProvider.releaseNumber(num.provider_number_sid);
    } catch (e) {
      const err =
        e instanceof AppError ? e : new AppError("We couldn't release that number.", { cause: e });
      return { error: `${err.userMessage} (ref ${err.errorId})` };
    }
    await supabaseAdmin.from("phone_numbers").delete().eq("id", num.id);
    if (num.receptionist_id)
      await supabaseAdmin
        .from("receptionists")
        .update({ status: "agent_ready" })
        .eq("id", num.receptionist_id)
        .eq("status", "live");
    return { error: null };
  });

/** Point an already-purchased number at a different (ready) receptionist. */
export const assignNumberFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), receptionistId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { org, role } = await loadEntitlement(context);
    if (role === "member") return { error: "Only workspace owners and admins can change numbers." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { audit } = await import("@/lib/org/org.server");
    const { AppError } = await import("@/lib/server/errors.server");
    const { twilioProvider } = await import("./twilio.server");

    const { data: num } = await supabaseAdmin
      .from("phone_numbers")
      .select("id, provider_number_sid, receptionist_id, status")
      .eq("id", data.id)
      .eq("organization_id", org.id)
      .maybeSingle();
    if (!num) return { error: "Number not found." };

    const { data: rec } = await context.supabase
      .from("receptionists")
      .select("id, name, elevenlabs_agent_id")
      .eq("id", data.receptionistId)
      .eq("organization_id", org.id)
      .maybeSingle();
    if (!rec?.elevenlabs_agent_id)
      return { error: "That receptionist isn't ready to take calls yet." };
    if (num.receptionist_id === rec.id) return { error: null };

    try {
      // Re-confirm routing before we claim the number is live for this receptionist.
      if (num.provider_number_sid) {
        const routed = await twilioProvider.configureNumber(num.provider_number_sid, voiceUrl());
        if (!routed) throw new AppError("We couldn't confirm call routing for that number.");
      }
    } catch (e) {
      const err =
        e instanceof AppError ? e : new AppError("We couldn't move that number.", { cause: e });
      return { error: `${err.userMessage} (ref ${err.errorId})` };
    }

    await supabaseAdmin
      .from("phone_numbers")
      .update({ receptionist_id: rec.id, status: "live", status_message: null })
      .eq("id", num.id);
    if (num.receptionist_id && num.receptionist_id !== rec.id) {
      await supabaseAdmin
        .from("receptionists")
        .update({ status: "agent_ready" })
        .eq("id", num.receptionist_id)
        .eq("status", "live");
    }
    await supabaseAdmin
      .from("receptionists")
      .update({ status: "live", status_message: null })
      .eq("id", rec.id);
    await audit(context.supabase, org.id, context.userId, "phone.assigned", {
      type: "phone_number",
      id: num.id,
    }).catch(() => {});
    return { error: null };
  });
