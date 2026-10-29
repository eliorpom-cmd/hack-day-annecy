import type { APIRoute } from "astro";
import { requireBusiness } from "../../../lib/env";
import { handle, HttpError, json } from "../../../lib/http";
import { parseCountry } from "../../../lib/numbers";
import { listOwnedNumbers, searchNumbers } from "../../../lib/twilio";

// Numbers for sale (FR: local + mobile) plus the numbers the Twilio account already owns
export const GET: APIRoute = handle(async ({ locals, url }) => {
  requireBusiness(locals);
  const country = parseCountry(url.searchParams.get("country"));
  if (!country) throw new HttpError(400, "invalid_country", "Pays non pris en charge : FR ou US.");
  const [available, owned] = await Promise.allSettled([searchNumbers(country), listOwnedNumbers()]);
  if (available.status === "rejected" && owned.status === "rejected") throw available.reason;
  const details = available.status === "fulfilled" ? available.value : [];
  return json({
    numbers: details.map((n) => n.e164),
    details,
    owned: owned.status === "fulfilled" ? owned.value : [],
    ...(available.status === "rejected" ? { search_error: (available.reason as HttpError).hint ?? "Recherche impossible." } : {}),
  });
});
