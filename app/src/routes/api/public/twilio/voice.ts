import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

function twiml(body: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}

const SORRY = `<Say voice="Polly.Joanna">Sorry, this line isn't available right now. Please try again later.</Say><Hangup/>`;

export const Route = createFileRoute("/api/public/twilio/voice")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const expected = process.env["TWILIO_VOICE_WEBHOOK_TOKEN"] ?? "";
        const given = url.searchParams.get("token") ?? "";
        if (!expected || given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
          return new Response("Forbidden", { status: 403 });
        }

        const form = await request.formData();
        const to = String(form.get("To") ?? "");
        const from = String(form.get("From") ?? "");
        if (!/^\+\d{8,15}$/.test(to)) return twiml(SORRY);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: num } = await supabaseAdmin
          .from("phone_numbers")
          .select("id, status, organization_id, receptionists(elevenlabs_agent_id, status)")
          .eq("phone_number", to)
          .maybeSingle();
        const rec = num?.receptionists as { elevenlabs_agent_id: string | null; status: string } | null;
        if (!num || num.status !== "live" || !rec?.elevenlabs_agent_id || rec.status === "suspended") return twiml(SORRY);

        // Usage guard: no active plan, or past the safety cap → don't answer.
        try {
          const { getUsage } = await import("@/lib/billing/usage.server");
          const usage = await getUsage(supabaseAdmin as never, num.organization_id);
          if (usage.level === "blocked") {
            console.log(JSON.stringify({ level: "warn", event: "twilio.call_blocked_usage", number_id: num.id, minutes: usage.minutesUsed }));
            return twiml(SORRY);
          }
        } catch (e) {
          console.error(JSON.stringify({ level: "error", event: "twilio.usage_check_failed", error: String(e) }));
        }

        try {
          const key = process.env["ELEVENLABS_API_KEY"];
          if (!key) throw new Error("ELEVENLABS_API_KEY missing");
          const res = await fetch("https://api.elevenlabs.io/v1/convai/twilio/register-call", {
            method: "POST",
            headers: { "xi-api-key": key, "Content-Type": "application/json" },
            body: JSON.stringify({ agent_id: rec.elevenlabs_agent_id, from_number: from || "unknown", to_number: to, direction: "inbound" }),
            signal: AbortSignal.timeout(8000),
          });
          if (!res.ok) throw new Error(`register-call ${res.status}: ${await res.text()}`);
          const xml = await res.text();
          console.log(JSON.stringify({ level: "info", event: "twilio.inbound_call", number_id: num.id }));
          return new Response(xml, { headers: { "Content-Type": "text/xml" } });
        } catch (e) {
          console.error(JSON.stringify({ level: "error", event: "twilio.inbound_call_failed", number_id: num.id, error: String(e) }));
          return twiml(SORRY);
        }
      },
    },
  },
});
