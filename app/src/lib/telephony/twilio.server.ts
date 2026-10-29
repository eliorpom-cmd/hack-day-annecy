import { AppError, log, retry, withTimeout } from "@/lib/server/errors.server";
import type { AvailableNumber, PurchasedNumber, TelephonyProvider } from "./provider";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

function headers() {
  const lovable = process.env["LOVABLE_API_KEY"];
  const twilio = process.env["TWILIO_API_KEY"];
  if (!lovable || !twilio) throw new AppError("Phone numbers aren't available right now.", { status: 503 });
  return { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": twilio };
}

async function twilioRequest<T>(path: string, init: { method?: string; form?: Record<string, string> } = {}): Promise<T> {
  const started = Date.now();
  const res = await retry(
    () =>
      withTimeout(
        fetch(`${GATEWAY_URL}${path}`, {
          method: init.method ?? "GET",
          headers: {
            ...headers(),
            ...(init.form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
          },
          body: init.form ? new URLSearchParams(init.form) : undefined,
        }),
        20000,
        `Twilio ${path}`,
      ).then(async (r) => {
        if (!r.ok) {
          const body = await r.text();
          console.error(`Twilio request failed [${r.status}] ${path}: ${body}`);
          throw new AppError("The phone provider couldn't complete that request.", {
            status: r.status >= 500 ? 502 : 400,
            context: { path, status: r.status, body: body.slice(0, 500) },
          });
        }
        return r;
      }),
    2,
  );
  log("twilio.request", { path, ms: Date.now() - started });
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

interface TwilioAvailable {
  phone_number: string;
  friendly_name: string;
  locality: string | null;
  region: string | null;
  capabilities: { voice: boolean };
}

export const twilioProvider: TelephonyProvider = {
  id: "twilio",
  async searchNumbers({ areaCode, contains, region, type }) {
    const params = new URLSearchParams({ PageSize: "12", VoiceEnabled: "true" });
    if (areaCode) params.set("AreaCode", areaCode);
    if (contains) params.set("Contains", contains);
    if (region && type !== "toll_free") params.set("InRegion", region);
    const kind = type === "toll_free" ? "TollFree" : "Local";
    const data = await twilioRequest<{ available_phone_numbers: TwilioAvailable[] }>(
      `/AvailablePhoneNumbers/US/${kind}.json?${params}`,
    );
    return data.available_phone_numbers
      .filter((n) => n.capabilities?.voice)
      .map<AvailableNumber>((n) => ({
        phoneNumber: n.phone_number,
        friendlyName: n.friendly_name,
        locality: n.locality || null,
        region: n.region || null,
      }));
  },
  async purchaseNumber({ phoneNumber, voiceUrl, label }) {
    const data = await twilioRequest<{ sid: string; phone_number: string; friendly_name: string; voice_url: string }>(
      "/IncomingPhoneNumbers.json",
      { method: "POST", form: { PhoneNumber: phoneNumber, VoiceUrl: voiceUrl, VoiceMethod: "POST", FriendlyName: label } },
    );
    return { sid: data.sid, phoneNumber: data.phone_number, voiceUrl: data.voice_url } satisfies PurchasedNumber;
  },
  async configureNumber(sid, voiceUrl) {
    const data = await twilioRequest<{ voice_url: string }>(`/IncomingPhoneNumbers/${sid}.json`, {
      method: "POST",
      form: { VoiceUrl: voiceUrl, VoiceMethod: "POST" },
    });
    return data.voice_url === voiceUrl;
  },
  async releaseNumber(sid) {
    await twilioRequest(`/IncomingPhoneNumbers/${sid}.json`, { method: "DELETE" });
  },
};
