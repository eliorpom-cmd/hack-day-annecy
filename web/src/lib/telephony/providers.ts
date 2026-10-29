// Outbound calls to ElevenLabs and Twilio. No Cloudflare imports: secrets are passed in.

// Asks ElevenLabs to take the call; returns the TwiML that connects Twilio to the agent
export async function registerElevenLabsCall(
  apiKey: string | undefined,
  args: { agentId: string; from: string; to: string; variables?: Record<string, string> },
): Promise<string> {
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY missing");
  const res = await fetch("https://api.elevenlabs.io/v1/convai/twilio/register-call", {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      agent_id: args.agentId, from_number: args.from || "unknown", to_number: args.to, direction: "inbound",
      // Values of the {{…}} of the prompt for this call (caller's number, free slots)
      ...(args.variables ? { conversation_initiation_client_data: { dynamic_variables: args.variables } } : {}),
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`register-call ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.text();
}

export type TwilioCreds = { accountSid?: string; authToken?: string; apiKeySid?: string; smsFrom?: string; whatsappFrom?: string };

// Sends one message through the Twilio Messages API and returns its sid; throws on failure
async function sendTwilioMessage(
  creds: TwilioCreds,
  from: string | undefined,
  to: string,
  body: string,
  channel: "SMS" | "WhatsApp",
): Promise<string> {
  const { accountSid, authToken } = creds;
  if (!accountSid || !authToken || !from) throw new Error(`Twilio ${channel} credentials missing`);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${creds.apiKeySid || accountSid}:${authToken}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Twilio ${channel} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return ((await res.json()) as { sid: string }).sid;
}

export async function sendTwilioSms(creds: TwilioCreds, to: string, body: string): Promise<string> {
  return sendTwilioMessage(creds, creds.smsFrom, to, body, "SMS");
}

// WhatsApp goes through the same Messages API, with the `whatsapp:` prefix on both numbers
export async function sendWhatsApp(creds: TwilioCreds, to: string, body: string): Promise<string> {
  const from = creds.whatsappFrom ? `whatsapp:${creds.whatsappFrom}` : undefined;
  return sendTwilioMessage(creds, from, `whatsapp:${to}`, body, "WhatsApp");
}

// Notifies the artisan. With `queueWhatsApp` (WHATSAPP_RELAY_TOKEN set), the message goes to the outbox
// drained by the Baileys relay on the Mac, and Twilio WhatsApp is skipped; SMS only if queueing fails.
// Otherwise: WhatsApp when TWILIO_WHATSAPP_FROM is set, SMS otherwise or as fallback.
// Never throws: the outcome is logged and returned so the caller can record it.
export async function sendCallNotification(
  creds: TwilioCreds,
  to: string,
  body: string,
  queueWhatsApp?: (to: string, body: string) => Promise<string>,
): Promise<{ channel: "whatsapp" | "sms" | "failed"; sid?: string }> {
  if (queueWhatsApp) {
    try {
      const id = await queueWhatsApp(to, body);
      logEvent("info", "whatsapp_relay.queued", { id });
      return { channel: "whatsapp", sid: id };
    } catch (e) {
      logEvent("warn", "whatsapp_relay.queue_failed_fallback_sms", { error: String(e) });
    }
  } else if (creds.whatsappFrom) {
    try {
      const sid = await sendWhatsApp(creds, to, body);
      logEvent("info", "twilio.call_notification_sent", { channel: "whatsapp", sid });
      return { channel: "whatsapp", sid };
    } catch (e) {
      logEvent("warn", "twilio.whatsapp_failed_fallback_sms", { error: String(e) });
    }
  }
  try {
    const sid = await sendTwilioSms(creds, to, body);
    logEvent("info", "twilio.call_notification_sent", { channel: "sms", sid });
    return { channel: "sms", sid };
  } catch (e) {
    logEvent("error", "twilio.call_notification_failed", { error: String(e) });
    return { channel: "failed" };
  }
}

export function logEvent(level: "info" | "warn" | "error", event: string, data: Record<string, unknown> = {}) {
  const line = JSON.stringify({ level, event, ...data });
  if (level === "error") console.error(line); else console.log(line);
}
