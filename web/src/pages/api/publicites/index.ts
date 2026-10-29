import type { APIRoute } from "astro";
import { requireBusiness } from "../../../lib/env";
import { handle, json } from "../../../lib/http";
import { adTargets, latestDrafts, type AdsBusiness } from "../../../lib/ads-run";

// Latest Google and Facebook/Instagram drafts, with the number the ads call
export const GET: APIRoute = handle(async ({ locals }) => {
  const b = requireBusiness(locals) as unknown as AdsBusiness;
  const [drafts, targets] = await Promise.all([latestDrafts(b.id), adTargets(b)]);
  return json({ ...drafts, ...targets });
});
