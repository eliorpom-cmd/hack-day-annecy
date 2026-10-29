import type { APIRoute } from "astro";
import { requireBusiness } from "../../lib/env";
import { handle, json } from "../../lib/http";
import { statsForBusiness } from "../../lib/stats";

// Dashboard counters over the last ?days= (default 7, max 365)
export const GET: APIRoute = handle(async ({ locals, url }) => {
  const b = requireBusiness(locals);
  const days = Math.min(365, Math.max(1, Math.floor(Number(url.searchParams.get("days")) || 7)));
  return json(await statsForBusiness(b.id, days));
});
