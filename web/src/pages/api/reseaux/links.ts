import type { APIRoute } from "astro";
import { db } from "../../../lib/db";
import { requireBusiness } from "../../../lib/env";
import { handle, HttpError, isRecord, json, readJson } from "../../../lib/http";
import { isNetwork, NETWORK_RULES, normalizePageUrl, parseSocialLinks } from "../../../lib/social";

// Links (or unlinks, url "") the artisan's existing page on one network: {network, url} → {links}
export const PUT: APIRoute = handle(async ({ request, locals }) => {
  const b = requireBusiness(locals);
  const body = await readJson(request);
  const network = isRecord(body) ? body.network : undefined;
  const raw = isRecord(body) && typeof body.url === "string" ? body.url : "";
  if (!isNetwork(network)) throw new HttpError(400, "invalid_network", "Choisissez Facebook, Instagram ou LinkedIn.");
  const links = parseSocialLinks(b.social_links);
  if (raw.trim()) {
    const url = normalizePageUrl(network, raw);
    if (!url) throw new HttpError(400, "invalid_url", `Collez l’adresse de votre page ${NETWORK_RULES[network].label}. Exemple\u00a0: ${NETWORK_RULES[network].url.replace(/^https:\/\/www\./, "").replace(/feed\/$/, "")}votre-page`);
    links[network] = url;
  } else {
    delete links[network];
  }
  await db().prepare("UPDATE businesses SET social_links = ? WHERE id = ?").bind(JSON.stringify(links), b.id).run();
  return json({ links });
});
