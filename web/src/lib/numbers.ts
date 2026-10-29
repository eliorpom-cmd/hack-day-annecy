// Twilio phone numbers, pure part: parsing and French error hints. Tested in test/numbers.test.ts.

export type AvailableNumber = { e164: string; friendly_name: string; locality: string | null; type: "local" | "mobile" };
export type OwnedNumber = { e164: string; sid: string; friendly_name: string; voice_url: string | null };

export const SEARCH_COUNTRIES = ["FR", "US"] as const;
export type SearchCountry = (typeof SEARCH_COUNTRIES)[number];

export function parseCountry(v: string | null): SearchCountry | null {
  const c = (v ?? "FR").toUpperCase();
  return (SEARCH_COUNTRIES as readonly string[]).includes(c) ? (c as SearchCountry) : null;
}

type TwAvailable = { phone_number?: string; friendly_name?: string; locality?: string | null; capabilities?: { voice?: boolean } };

export function parseAvailable(json: unknown, type: "local" | "mobile"): AvailableNumber[] {
  const list = (json as { available_phone_numbers?: TwAvailable[] })?.available_phone_numbers ?? [];
  return list
    .filter((n) => n.phone_number && n.capabilities?.voice !== false)
    .map((n) => ({ e164: n.phone_number!, friendly_name: n.friendly_name ?? n.phone_number!, locality: n.locality || null, type }));
}

type TwIncoming = { sid?: string; phone_number?: string; friendly_name?: string; voice_url?: string | null };

export function parseIncoming(json: unknown): OwnedNumber[] {
  const list = (json as { incoming_phone_numbers?: TwIncoming[] })?.incoming_phone_numbers ?? [];
  return list
    .filter((n) => n.sid && n.phone_number)
    .map((n) => ({ e164: n.phone_number!, sid: n.sid!, friendly_name: n.friendly_name ?? n.phone_number!, voice_url: n.voice_url || null }));
}

// Turns a Twilio error body into a French sentence; French numbers often need a regulatory bundle
export function twilioErrorHint(status: number, body: string): string {
  let code = 0, message = "";
  try {
    const j = JSON.parse(body) as { code?: number; message?: string };
    code = Number(j.code ?? 0);
    message = String(j.message ?? "");
  } catch {
    message = body.slice(0, 200);
  }
  if (status === 401 || code === 20003) return "Twilio refuse les identifiants : vérifiez TWILIO_ACCOUNT_SID et TWILIO_AUTH_TOKEN.";
  if (code === 21649 || code === 21631 || /bundle|regulat|address/i.test(message))
    return `Ce numéro exige un dossier réglementaire validé chez Twilio (justificatif d'identité et adresse en France). Créez-le dans la console Twilio puis renseignez TWILIO_BUNDLE_SID et TWILIO_ADDRESS_SID, ou branchez un numéro que le compte possède déjà. Message de Twilio : ${message}`;
  if (code === 21422 || code === 21452) return `Ce numéro n'est plus disponible, choisissez-en un autre. (${message})`;
  if (code === 20404 || status === 404) return `Aucun numéro trouvé pour ce pays sur ce compte Twilio. (${message || "404"})`;
  if (code === 21404 || /trial/i.test(message)) return `Le compte Twilio est en mode d'essai : ajoutez du crédit pour acheter un numéro. (${message})`;
  return `Twilio a refusé la demande (${status}${code ? `, code ${code}` : ""}) : ${message || "erreur inconnue"}`;
}
