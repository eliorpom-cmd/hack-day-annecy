import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { z } from "zod";

/** Called by the receptionist during a call (browser test or phone) to check times and book. */
function authorized(url: URL) {
  const expected = process.env["RECEPTIONIST_TOOL_TOKEN"];
  const got = url.searchParams.get("token") ?? "";
  if (!expected || got.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

const availabilitySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  duration_minutes: z.coerce.number().int().min(15).max(240).optional(),
});
const bookSchema = z.object({
  start: z.string().min(10).max(40),
  caller_name: z.string().trim().min(1).max(120),
  caller_phone: z.string().trim().max(30).optional(),
  service: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
  duration_minutes: z.coerce.number().int().min(15).max(240).optional(),
});

export const Route = createFileRoute("/api/public/receptionist/tools")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        if (!authorized(url)) return new Response("Forbidden", { status: 403 });
        const recId = z.string().uuid().safeParse(url.searchParams.get("rid"));
        const action = url.searchParams.get("action");
        if (!recId.success)
          return Response.json({ error: "Unknown receptionist" }, { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: rec } = await supabaseAdmin
          .from("receptionists")
          .select("id, organization_id")
          .eq("id", recId.data)
          .maybeSingle();
        if (!rec) return Response.json({ error: "Unknown receptionist" }, { status: 404 });
        const body = await request.json().catch(() => ({}));
        const { getAvailability, bookAppointment } = await import("@/lib/calendar/calendar.server");

        try {
          if (action === "availability") {
            const p = availabilitySchema.parse(body);
            const a = await getAvailability(rec.organization_id, {
              date: p.date || undefined,
              durationMinutes: p.duration_minutes,
              days: 3,
            });
            return Response.json({
              today: a.todayLabel,
              timezone: a.timezone,
              open_times: a.days
                .flatMap((d) =>
                  d.slots.slice(0, 6).map((s) => ({ start: s.start, spoken: s.label })),
                )
                .slice(0, 12),
              note: a.days.every((d) => d.slots.length === 0)
                ? "No open times on those days. Offer another day or take a message."
                : undefined,
            });
          }
          if (action === "book") {
            const p = bookSchema.parse(body);
            const r = await bookAppointment(rec.organization_id, {
              start: p.start,
              durationMinutes: p.duration_minutes,
              name: p.caller_name,
              phone: p.caller_phone,
              service: p.service,
              notes: p.notes,
              source: "receptionist",
              receptionistId: rec.id,
            });
            return Response.json(r);
          }
          return Response.json({ error: "Unknown action" }, { status: 400 });
        } catch (e) {
          const msg =
            (e as { userMessage?: string }).userMessage ?? "The calendar is unavailable right now.";
          return Response.json({
            confirmed: false,
            error: `${msg} Take a message so the team can call back.`,
          });
        }
      },
    },
  },
});
