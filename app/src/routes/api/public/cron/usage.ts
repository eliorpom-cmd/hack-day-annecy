import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

/** Every 15 min: sync calls for orgs with a live number and bill overage minutes. */
export const Route = createFileRoute("/api/public/cron/usage")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env["USAGE_CRON_TOKEN"] ?? "";
        const given = (request.headers.get("authorization") ?? "").replace(/^Bearer /, "");
        if (!expected || given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { syncOrgCalls } = await import("@/lib/calls/calls.server");
        const { chargeOverage } = await import("@/lib/billing/usage.server");
        const { data: nums } = await supabaseAdmin.from("phone_numbers").select("organization_id").eq("status", "live");
        const orgIds = [...new Set((nums ?? []).map((n) => n.organization_id))];
        let billed = 0;
        for (const orgId of orgIds) {
          try {
            await syncOrgCalls(orgId);
            billed += (await chargeOverage(orgId)).charged;
          } catch (e) {
            console.error(JSON.stringify({ level: "error", event: "cron.usage_failed", org_id: orgId, error: String(e) }));
          }
        }
        return Response.json({ orgs: orgIds.length, billed_minutes: billed });
      },
    },
  },
});
