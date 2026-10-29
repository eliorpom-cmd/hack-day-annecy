import type { APIRoute } from "astro";
import { requireBusiness } from "../../../lib/env";
import { handle, HttpError, isRecord, json, readJson } from "../../../lib/http";
import { isAdChannel } from "../../../lib/ads";
import { adTargets, generateDraft, type AdsBusiness } from "../../../lib/ads-run";

// Writes a new draft for one channel: {channel: "google" | "meta"} → {channel, draft, phone, siteUrl}
export const POST: APIRoute = handle(async ({ locals, request }) => {
  const b = requireBusiness(locals) as unknown as AdsBusiness;
  const body = await readJson(request);
  const channel = isRecord(body) ? body.channel : undefined;
  if (!isAdChannel(channel)) throw new HttpError(400, "invalid_channel", "Choisissez Google ou Facebook et Instagram.");
  if (!b.trade.trim() && !b.name.trim()) {
    throw new HttpError(400, "missing_trade", "Ajoutez votre métier dans les réglages, puis réessayez.");
  }
  const draft = await generateDraft(b, channel);
  return json({ channel, draft, ...(await adTargets(b)) });
});
