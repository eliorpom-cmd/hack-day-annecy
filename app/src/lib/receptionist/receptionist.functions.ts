import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { receptionistInputSchema } from "@/lib/business/schema";

const idSchema = z.object({ id: z.string().uuid() });

const settingsPatchSchema = z
  .object({
    answering_mode: z.enum(["receptionist_first", "human_first", "after_hours_only", "overflow_only"]).optional(),
    after_hours_enabled: z.boolean().optional(),
    appointment_booking_enabled: z.boolean().optional(),
    call_transfer_enabled: z.boolean().optional(),
    transfer_destinations: z
      .array(
        z.object({
          name: z.string().min(1).max(80),
          department: z.string().max(80).optional(),
          phone: z.string().max(40).optional(),
          rules: z.array(z.string().max(40)).max(10).optional(),
        }),
      )
      .max(10)
      .optional(),
    voicemail_enabled: z.boolean().optional(),
    recording_enabled: z.boolean().optional(),
    transcription_enabled: z.boolean().optional(),
    max_call_duration: z.number().int().min(60).max(3600).optional(),
  })
  .strict();

export const listReceptionistsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireOrg } = await import("@/lib/org/org.server");
    const { org } = await requireOrg(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("receptionists")
      .select("id, name, status, status_message, language, greeting, elevenlabs_agent_id, created_at, voices(name, description)")
      .eq("organization_id", org.id)
      .order("created_at");
    return (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      status_message: r.status_message,
      language: r.language,
      greeting: r.greeting,
      has_agent: !!r.elevenlabs_agent_id,
      created_at: r.created_at,
      voice_name: (r.voices as { name: string } | null)?.name ?? null,
    }));
  });

/** Create a receptionist from the saved business profile and immediately create its agent. */
export const createReceptionistFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => receptionistInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { requireOrg, audit } = await import("@/lib/org/org.server");
    const { publishReceptionist } = await import("./receptionist.server");
    const { AppError } = await import("@/lib/server/errors.server");
    const db = context.supabase;
    const { org } = await requireOrg(db, context.userId);

    const [{ count }, { data: plan }] = await Promise.all([
      db.from("receptionists").select("id", { count: "exact", head: true }).eq("organization_id", org.id),
      db.from("plans").select("max_receptionists").eq("id", org.plan_id).maybeSingle(),
    ]);
    if ((count ?? 0) >= (plan?.max_receptionists ?? 1)) {
      throw new AppError("Your plan includes one receptionist. Upgrade to add more.", { status: 403 });
    }

    const { data: rec, error } = await db
      .from("receptionists")
      .insert({
        organization_id: org.id,
        name: data.name,
        voice_id: data.voice_id,
        greeting: data.greeting,
        personality: data.personality,
        tone: data.tone,
        language: data.language,
        custom_instructions: data.custom_instructions ?? null,
        status: "creating_agent",
      })
      .select("id")
      .single();
    if (error || !rec) throw new AppError("We couldn't create your receptionist.", { cause: error });
    await db.from("receptionist_settings").insert({ receptionist_id: rec.id, organization_id: org.id });
    await audit(db, org.id, context.userId, "receptionist.created", { type: "receptionist", id: rec.id });

    const result = await publishReceptionist(db, rec.id, { create: true });
    await db.from("organizations").update({ onboarding_step: "test" }).eq("id", org.id);
    return { id: rec.id, status: result.status };
  });

export const getReceptionistFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { AppError } = await import("@/lib/server/errors.server");
    const { data: rec, error } = await context.supabase
      .from("receptionists")
      .select("*, voices(id, name, description, gender), receptionist_settings(*), organizations(name, slug, plan_id)")
      .eq("id", data.id)
      .single();
    if (error || !rec) throw new AppError("Receptionist not found.", { status: 404, cause: error });
    const settings = Array.isArray(rec.receptionist_settings) ? rec.receptionist_settings[0] : rec.receptionist_settings;
    return {
      id: rec.id,
      name: rec.name,
      status: rec.status,
      status_message: rec.status_message,
      language: rec.language,
      supported_languages: rec.supported_languages,
      greeting: rec.greeting,
      after_hours_greeting: rec.after_hours_greeting,
      personality: rec.personality,
      tone: rec.tone,
      custom_instructions: rec.custom_instructions,
      has_agent: !!rec.elevenlabs_agent_id,
      config_version: rec.config_version,
      last_published_at: rec.last_published_at,
      created_at: rec.created_at,
      voice: rec.voices as { id: string; name: string; description: string | null; gender: string | null } | null,
      settings: settings ?? null,
      organization: rec.organizations as { name: string; slug: string; plan_id: string } | null,
    };
  });

export const getReceptionistStatusFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: rec } = await context.supabase
      .from("receptionists")
      .select("status, status_message, elevenlabs_agent_id")
      .eq("id", data.id)
      .maybeSingle();
    return rec ? { status: rec.status, status_message: rec.status_message, has_agent: !!rec.elevenlabs_agent_id } : null;
  });

const updateSchema = z.object({
  id: z.string().uuid(),
  patch: receptionistInputSchema.partial().extend({ after_hours_greeting: z.string().max(400).nullable().optional() }),
  settings: settingsPatchSchema.optional(),
});

/** Update receptionist config and republish the agent (browser + phone share one config). */
export const updateReceptionistFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { publishReceptionist } = await import("./receptionist.server");
    const { AppError } = await import("@/lib/server/errors.server");
    const db = context.supabase;
    if (Object.keys(data.patch).length) {
      const { error } = await db.from("receptionists").update(data.patch).eq("id", data.id);
      if (error) throw new AppError("We couldn't save those changes.", { cause: error });
    }
    if (data.settings && Object.keys(data.settings).length) {
      const { error } = await db.from("receptionist_settings").update(data.settings as never).eq("receptionist_id", data.id);
      if (error) throw new AppError("We couldn't save those settings.", { cause: error });
    }
    const result = await publishReceptionist(db, data.id);
    return { ok: true, status: result.status };
  });

/** Retry agent creation after an error. */
export const retryReceptionistFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { publishReceptionist } = await import("./receptionist.server");
    const { data: rec } = await context.supabase.from("receptionists").select("elevenlabs_agent_id").eq("id", data.id).single();
    const result = await publishReceptionist(context.supabase, data.id, { create: !rec?.elevenlabs_agent_id });
    return { ok: true, status: result.status };
  });

/** Short-lived browser conversation token for testing a receptionist. */
export const getTestTokenFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { ElevenLabsService } = await import("@/lib/elevenlabs/index.server");
    const { AppError } = await import("@/lib/server/errors.server");
    const { data: rec } = await context.supabase
      .from("receptionists")
      .select("elevenlabs_agent_id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (!rec?.elevenlabs_agent_id) throw new AppError("Your receptionist isn't ready to test yet.", { status: 400 });
    try {
      const res = await ElevenLabsService.getConversationToken(rec.elevenlabs_agent_id);
      return { token: res.token, mock: !!res.mock };
    } catch (e) {
      throw new AppError("We couldn't start a test call right now. Please try again.", { cause: e });
    }
  });

export const deleteReceptionistFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { ElevenLabsService } = await import("@/lib/elevenlabs/index.server");
    const { requireOrg, audit } = await import("@/lib/org/org.server");
    const { org } = await requireOrg(context.supabase, context.userId);
    const { data: rec } = await context.supabase.from("receptionists").select("elevenlabs_agent_id").eq("id", data.id).single();
    if (rec?.elevenlabs_agent_id) {
      try {
        await ElevenLabsService.deleteAgent(rec.elevenlabs_agent_id);
      } catch (e) {
        console.error("agent delete failed", e);
      }
    }
    await context.supabase.from("receptionists").delete().eq("id", data.id);
    await audit(context.supabase, org.id, context.userId, "receptionist.deleted", { type: "receptionist", id: data.id });
    return { ok: true };
  });
