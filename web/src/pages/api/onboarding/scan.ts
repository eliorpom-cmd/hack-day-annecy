import type { APIRoute } from "astro";
import { requireBusiness } from "../../../lib/env";
import { handle, HttpError, json, readJson } from "../../../lib/http";
import { safeScanUrl } from "../../../lib/scan";
import { scanWebsite } from "../../../lib/scan-run";

// Reads the artisan's website and proposes business fields + FAQs (nothing is saved here)
export const POST: APIRoute = handle(async ({ request, locals }) => {
  requireBusiness(locals);
  const body = await readJson<{ url?: unknown }>(request);
  const url = safeScanUrl(body?.url);
  if (!url) throw new HttpError(400, "invalid_url", "Indiquez l'adresse de votre site, par exemple plomberie-dupont.fr.");
  const scanned = await scanWebsite(url);
  if (!scanned)
    throw new HttpError(422, "site_unreachable", "Impossible de lire ce site (il ne répond pas ou n'est pas une page web). Vérifiez l'adresse ou remplissez la fiche à la main.");
  const { result, pages, ai } = scanned;
  return json({
    business: { name: result.name, trade: result.trade, city: result.city, description: result.description, website: url.toString(), artisan_phone: result.phone },
    hours: result.hours,
    faqs: result.faqs,
    source: { pages, ai_model: ai.model, ...(ai.model ? {} : { hint: "Lecture simplifiée : l'IA n'était pas disponible, seuls le nom et le téléphone ont été repris." }) },
  });
});
