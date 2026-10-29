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
// A forwarded call (mode « renvoi » or a ForwardedFrom on the request) already rang his phone: straight to the agent.
export function shouldRingArtisan(r: RoutingInput): boolean {
  if (!r.artisanPhone) return false;
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
