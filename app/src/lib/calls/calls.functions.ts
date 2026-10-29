import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Sync new calls from the voice provider, then return everything the dashboard needs. */
export const getCallDataFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { days?: number } | undefined) =>
    z.object({ days: z.number().int().min(1).max(365).optional() }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { requireOrg } = await import("@/lib/org/org.server");
    const { org } = await requireOrg(context.supabase, context.userId);
    let syncError: string | null = null;
    try {
      const { syncOrgCalls } = await import("./calls.server");
      await syncOrgCalls(org.id);
    } catch (e) {
      console.error(JSON.stringify({ level: "error", event: "calls.sync", error: String(e) }));
      syncError = "We couldn't fetch the newest calls just now. Showing what we have.";
    }
    const days = data.days ?? 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const [{ data: calls }, { data: clients }, { data: appts }] = await Promise.all([
      context.supabase
        .from("calls")
        .select(
          "id, channel, caller_phone, status, outcome, summary, title, duration_secs, has_audio, started_at, client_id, receptionist_id",
        )
        .eq("organization_id", org.id)
        .gte("started_at", since)
        .order("started_at", { ascending: false })
        .limit(500),
      context.supabase
        .from("clients")
        .select("id, phone, name, email, first_call_at, last_call_at, call_count, last_summary")
        .eq("organization_id", org.id)
        .order("last_call_at", { ascending: false })
        .limit(500),
      context.supabase
        .from("appointments")
        .select("id, created_at, status")
        .eq("organization_id", org.id)
        .gte("created_at", since),
    ]);
    return {
      calls: calls ?? [],
      clients: clients ?? [],
      appointments: appts ?? [],
      timezone: org.timezone,
      syncError,
    };
  });

export const getCallDetailFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { requireOrg } = await import("@/lib/org/org.server");
    const { org } = await requireOrg(context.supabase, context.userId);
    const { data: call } = await context.supabase
      .from("calls")
      .select("*")
      .eq("organization_id", org.id)
      .eq("id", data.id)
      .maybeSingle();
    if (!call) throw new Error("Call not found.");
    return call as typeof call & {
      transcript: { role: "user" | "agent"; message: string; t: number }[];
    };
  });

/** Returns the recording as a base64 data URL. */
export const getCallAudioFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { requireOrg } = await import("@/lib/org/org.server");
    const { org } = await requireOrg(context.supabase, context.userId);
    const { data: call } = await context.supabase
      .from("calls")
      .select("external_id")
      .eq("organization_id", org.id)
      .eq("id", data.id)
      .maybeSingle();
    if (!call) throw new Error("Call not found.");
    const { getConversationAudio } = await import("@/lib/elevenlabs/conversations.server");
    const res = await getConversationAudio(call.external_id).catch(() => null);
    if (!res) return { url: null as string | null };
    const buf = Buffer.from(await res.arrayBuffer());
    return { url: `data:audio/mpeg;base64,${buf.toString("base64")}` };
  });
