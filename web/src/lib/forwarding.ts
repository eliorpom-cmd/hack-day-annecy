// Call-forwarding codes (GSM, all French operators) the artisan dials on his mobile to keep his own number:
// unanswered, declined/busy and unreachable calls go to the répondeur number. Pure, tested in test/forwarding.test.ts.

export type ForwardingCode = { key: "no-answer" | "busy" | "unreachable" | "stop"; label: string; code: string; href: string };

// No-answer delay accepted by the network: 5 to 30 s, by steps of 5
export function forwardingDelay(seconds: number): number {
  const s = Math.round((Number(seconds) || 20) / 5) * 5;
  return Math.min(30, Math.max(5, s));
}

// tel: link that dials a code: * stays as is, # must be encoded (%23) or the browser cuts the link there
export function telHref(code: string): string {
  return `tel:${code.replace(/#/g, "%23")}`;
}

export const STOP_CODE = "##002#";

// Codes with the répondeur number filled in (E.164, « +33… »), in the order shown to the artisan
export function forwardingCodes(e164: string, seconds = 20): ForwardingCode[] {
  const n = e164.replace(/[^\d+]/g, "");
  const delay = forwardingDelay(seconds);
  const codes: Omit<ForwardingCode, "href">[] = [
    { key: "no-answer", label: `Si vous ne répondez pas (${delay} s)`, code: `**61*${n}**${delay}#` },
    { key: "busy", label: "Si vous refusez l’appel ou êtes déjà en ligne", code: `**67*${n}#` },
    { key: "unreachable", label: "Si votre portable est éteint ou sans réseau", code: `**62*${n}#` },
  ];
  return codes.map((c) => ({ ...c, href: telHref(c.code) }));
}

export const STOP_FORWARDING: ForwardingCode = { key: "stop", label: "Pour arrêter", code: STOP_CODE, href: telHref(STOP_CODE) };
