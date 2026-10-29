// Pure TwiML builders.

export function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export function twimlDoc(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`;
}

export function twimlResponse(xml: string): Response {
  return new Response(xml, { headers: { "Content-Type": "text/xml; charset=utf-8" } });
}

// Rings the artisan; Twilio calls `action` when the dial ends (answered or not)
export function dialArtisan(phone: string, ringSeconds: number, action: string): string {
  const timeout = Math.min(Math.max(Math.round(ringSeconds) || 15, 5), 60);
  return twimlDoc(
    `<Dial timeout="${timeout}" action="${escapeXml(action)}" method="POST" answerOnBridge="true"><Number>${escapeXml(phone)}</Number></Dial>`,
  );
}

export const SORRY_TEXT =
  "Désolé, nous ne pouvons pas prendre votre appel pour le moment. Merci de rappeler un peu plus tard.";

export function sayAndHangup(text = SORRY_TEXT): string {
  return twimlDoc(`<Say language="fr-FR">${escapeXml(text)}</Say><Hangup/>`);
}

export function hangup(): string {
  return twimlDoc("<Hangup/>");
}

// Dial outcomes that mean the artisan did not take the call (busy = declined)
export function artisanMissed(dialCallStatus: string): boolean {
  return ["no-answer", "busy", "failed", "canceled"].includes(dialCallStatus);
}
