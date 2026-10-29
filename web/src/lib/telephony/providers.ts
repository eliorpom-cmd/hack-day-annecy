// Outbound calls to ElevenLabs and Twilio. No Cloudflare imports: secrets are passed in.

// Asks ElevenLabs to take the call; returns the TwiML that connects Twilio to the agent
export async function registerElevenLabsCall(
  apiKey: string | undefined,
  args: { agentId: string; from: string; to: string },
): Promise<string> {
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY missing");
  const res = await fetch("https://api.elevenlabs.io/v1/convai/twilio/register-call", {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ agent_id: args.agentId, from_number: args.from || "unknown", to_number: args.to, direction: "inbound" }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`register-call ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.text();
}

export type TwilioCreds = { accountSid?: string; authToken?: string; smsFrom?: string };

export async function sendTwilioSms(creds: TwilioCreds, to: string, body: string): Promise<string> {
  const { accountSid, authToken, smsFrom } = creds;
  if (!accountSid || !authToken || !smsFrom) throw new Error("Twilio SMS credentials missing");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: smsFrom, Body: body }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Twilio SMS ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return ((await res.json()) as { sid: string }).sid;
}

export function logEvent(level: "info" | "warn" | "error", event: string, data: Record<string, unknown> = {}) {
  const line = JSON.stringify({ level, event, ...data });
  if (level === "error") console.error(line); else console.log(line);
}
