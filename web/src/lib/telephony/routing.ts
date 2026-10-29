// Pure routing decision of an incoming call (no Cloudflare imports, tested in test/telephony.test.ts).
import { isWithinHours, type HoursRow } from "./hours.ts";

export type RoutingInput = {
  artisanPhone: string | null;
  hours: HoursRow[];               // no rows = « Pas d'horaires fixes »: the artisan can be rung at any time
  forwardingMode: "renvoi" | "numero" | null;
  forwarded: boolean;              // Twilio says the call was forwarded from another number
  now: Date;
};

// True when the artisan's phone must ring before the agent answers.
// 29/10: never. The répondeur number is the one clients try first, and the répondeur answers straight away (no
// ringing on the artisan's mobile, so a demo call is never caught by his phone). The rules below stay for later.
export const RING_ARTISAN_FIRST = false;
export function shouldRingArtisan(r: RoutingInput): boolean {
  if (!RING_ARTISAN_FIRST || !r.artisanPhone) return false;
  if (r.forwardingMode === "renvoi" || r.forwarded) return false;
  if (!r.hours.length) return true;
  return isWithinHours(r.hours, r.now);
}

// Twilio sets ForwardedFrom when the carrier tells it the call was forwarded (call forwarding on the artisan's mobile).
// Some carriers only send a SIP Diversion header instead.
export function isForwardedCall(form: { get(name: string): unknown }): boolean {
  const forwardedFrom = String(form.get("ForwardedFrom") ?? "").trim();
  const diversion = String(form.get("SipHeader_Diversion") ?? form.get("Diversion") ?? "").trim();
  return !!forwardedFrom || !!diversion;
}
