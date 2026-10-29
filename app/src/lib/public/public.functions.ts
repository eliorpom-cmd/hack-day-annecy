import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const getPlansFn = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await publicClient()
    .from("plans")
    .select("id, name, description, monthly_price, annual_price, included_minutes, included_numbers, max_receptionists, max_concurrent_calls, overage_price_per_minute, features, highlights, is_popular, is_custom, sort_order")
    .eq("active", true)
    .order("sort_order");
  return (data ?? []).map((p) => ({
    ...p,
    monthly_price: Number(p.monthly_price),
    annual_price: Number(p.annual_price),
    overage_price_per_minute: Number(p.overage_price_per_minute),
    features: (p.features ?? {}) as Record<string, boolean>,
  }));
});

export const getVoicesFn = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await publicClient()
    .from("voices")
    .select("id, name, language, gender, description, accent, preview_url, recommended_industries, is_default, sort_order")
    .eq("active", true)
    .order("sort_order");
  return data ?? [];
});

const DEMO_SECONDS = 60;
const DEMO_MAX_SESSIONS_PER_DAY = 5;

async function sha256(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const DEMO_PROMPT = `IDENTITY
You are Ava, the AI receptionist for Harbor Dental Studio, a friendly family dental practice in Austin, Texas. You are also a live demo of AI Phone Desk, so if the caller asks what you are, explain briefly that you're an AI receptionist built with AI Phone Desk and that any business can have one in minutes.

BUSINESS INFORMATION
Location: 2200 Lakeshore Blvd, Austin, TX 78741
Phone: (512) 555-0188
Hours: Monday–Thursday 8 AM – 6 PM, Friday 8 AM – 2 PM, closed Saturday and Sunday.
Services: New patient exam & cleaning ($149), routine cleaning ($99), teeth whitening ($299), Invisalign consultation (free), emergency visit (from $120), fillings (from $180).
Team: Dr. Maya Chen (dentist), Dr. Luis Ortega (dentist), Priya (office manager).
Policies: 24-hour cancellation notice; most PPO insurance accepted; interest-free payment plans available.

CALL HANDLING
Answer questions about hours, services, prices and location. Help callers request appointments: collect name, phone number, service, and preferred day/time, then say the team will confirm by text. Keep answers to one to three sentences — this is a phone call. Be warm and natural.

SAFETY
Never invent information beyond the above. Never confirm an appointment as booked — describe it as a request the team will confirm. Do not discuss any other business's data. If asked about anything unrelated, politely steer back.`;

/** Free landing-page demo: rate-limited, dedicated demo agent, never touches customer data. */
export const getDemoTokenFn = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { ElevenLabsService } = await import("@/lib/elevenlabs/index.server");
  const { AppError } = await import("@/lib/server/errors.server");

  const req = getRequest();
  const ip = req?.headers.get("cf-connecting-ip") || req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ipHash = await sha256(`${ip}:${process.env["LOVABLE_CRON_SECRET"] ?? "salt"}`);

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("demo_sessions")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("started_at", since);
  if ((count ?? 0) >= DEMO_MAX_SESSIONS_PER_DAY) {
    throw new AppError("You've reached today's demo limit. Create a free account to keep talking to your own receptionist.", { status: 429 });
  }

  if (ElevenLabsService.isDemoMode()) {
    return { token: "", mock: true, secondsAllowed: DEMO_SECONDS };
  }

  // Resolve (or lazily create) the dedicated demo agent.
  const { data: setting } = await supabaseAdmin.from("platform_settings").select("value").eq("key", "demo_agent").maybeSingle();
  let agentId = (setting?.value as { agent_id?: string } | null)?.agent_id;
  if (!agentId) {
    try {
      const created = await ElevenLabsService.createAgent({
        name: "AI Phone Desk — Public demo (Harbor Dental Studio)",
        voiceId: "EXAVITQu4vr4xnSDxMaL",
        firstMessage: "Hi, thanks for calling Harbor Dental Studio! This is Ava. How can I help you today?",
        prompt: DEMO_PROMPT,
        language: "en",
        maxDurationSeconds: DEMO_SECONDS,
      });
      agentId = created.agent_id;
      await supabaseAdmin.from("platform_settings").upsert({ key: "demo_agent", value: { agent_id: agentId } });
    } catch (e) {
      throw new AppError("The demo isn't available right now. Please try again in a moment.", { cause: e });
    }
  }

  try {
    const { token } = await ElevenLabsService.getConversationToken(agentId);
    await supabaseAdmin.from("demo_sessions").insert({ ip_hash: ipHash, seconds_allowed: DEMO_SECONDS });
    return { token, mock: false, secondsAllowed: DEMO_SECONDS };
  } catch (e) {
    throw new AppError("The demo isn't available right now. Please try again in a moment.", { cause: e });
  }
});
