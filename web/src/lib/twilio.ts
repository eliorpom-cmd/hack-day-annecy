// Twilio REST calls for phone numbers (search, purchase, attach an owned number).
import { twilioVoiceWebhookUrl } from "./telephony/agent-config";
import { appUrl, secret } from "./env";
import { HttpError } from "./http";
import { parseAvailable, parseIncoming, twilioErrorHint, type AvailableNumber, type OwnedNumber, type SearchCountry } from "./numbers";

function creds() {
  // Auth Token, or an API Key (SK… + secret) acting for the account (URL still uses the AC… SID)
  const sid = secret("TWILIO_ACCOUNT_SID");
  const user = secret("TWILIO_API_KEY_SID") || sid, token = secret("TWILIO_API_KEY_SECRET") || secret("TWILIO_AUTH_TOKEN");
  if (!sid || !token)
    throw new HttpError(503, "twilio_not_configured", "Twilio n'est pas configuré : ajoutez TWILIO_ACCOUNT_SID et TWILIO_AUTH_TOKEN dans web/.dev.vars (ou wrangler secret put).");
  return { sid, user, token };
}

async function twilio(path: string, init: { method?: string; form?: Record<string, string> } = {}): Promise<unknown> {
  const { sid, user, token } = creds();
  let res: Response;
  try {
    res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Basic ${btoa(`${user}:${token}`)}`,
        ...(init.form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      },
      body: init.form ? new URLSearchParams(init.form) : undefined,
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new HttpError(502, "twilio_unreachable", "Twilio ne répond pas. Réessayez dans un instant.");
  }
  const text = await res.text();
  if (!res.ok) {
    console.error(JSON.stringify({ event: "twilio.error", path: path.split("?")[0], status: res.status, body: text.slice(0, 500) }));
    throw new HttpError(res.status === 401 ? 503 : 502, "twilio_error", twilioErrorHint(res.status, text));
  }
  return text ? JSON.parse(text) : null;
}

// The Twilio number must call our public voice webhook; localhost is unreachable for Twilio
export function voiceWebhook(): { url: string; warning?: string } {
  const token = secret("TWILIO_WEBHOOK_TOKEN");
  if (!token) throw new HttpError(503, "twilio_webhook_token_missing", "Ajoutez TWILIO_WEBHOOK_TOKEN (une longue chaîne aléatoire) dans web/.dev.vars : il protège le webhook des appels entrants.");
  const base = appUrl();
  const warning = /localhost|127\.0\.0\.1/.test(base)
    ? "APP_URL pointe vers localhost : Twilio ne pourra pas joindre le webhook. Utilisez l'URL publique (déploiement ou tunnel) dans APP_URL."
    : undefined;
  return { url: twilioVoiceWebhookUrl(base, token), warning };
}

export async function searchNumbers(country: SearchCountry): Promise<AvailableNumber[]> {
  const params = new URLSearchParams({ VoiceEnabled: "true", PageSize: "10" });
  // France: local (01–05) and mobile (06/07) ranges; US: local only is enough for the demo
  const kinds: ("local" | "mobile")[] = country === "FR" ? ["local", "mobile"] : ["local"];
  const results = await Promise.allSettled(
    kinds.map(async (k) => parseAvailable(await twilio(`/AvailablePhoneNumbers/${country}/${k === "local" ? "Local" : "Mobile"}.json?${params}`), k)),
  );
  const ok = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  if (!ok.length) {
    const firstError = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
    if (firstError) throw firstError.reason;
  }
  return ok;
}

export async function listOwnedNumbers(): Promise<OwnedNumber[]> {
  return parseIncoming(await twilio("/IncomingPhoneNumbers.json?PageSize=50"));
}

// Points an owned number at our voice webhook
export async function configureNumber(sid: string, voiceUrl: string): Promise<OwnedNumber> {
  const n = parseIncoming({ incoming_phone_numbers: [await twilio(`/IncomingPhoneNumbers/${sid}.json`, { method: "POST", form: { VoiceUrl: voiceUrl, VoiceMethod: "POST" } })] });
  if (!n[0]) throw new HttpError(502, "twilio_error", "Réponse inattendue de Twilio.");
  return n[0];
}

export async function purchaseNumber(e164: string, voiceUrl: string, label: string): Promise<OwnedNumber> {
  const form: Record<string, string> = { PhoneNumber: e164, VoiceUrl: voiceUrl, VoiceMethod: "POST", FriendlyName: label.slice(0, 64) };
  // Regulatory bundle and address, required for most French numbers
  const bundle = secret("TWILIO_BUNDLE_SID"), address = secret("TWILIO_ADDRESS_SID");
  if (bundle) form.BundleSid = bundle;
  if (address) form.AddressSid = address;
  const n = parseIncoming({ incoming_phone_numbers: [await twilio("/IncomingPhoneNumbers.json", { method: "POST", form })] });
  if (!n[0]) throw new HttpError(502, "twilio_error", "Réponse inattendue de Twilio.");
  return n[0];
}
