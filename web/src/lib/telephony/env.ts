// Telephony secrets from the Worker env; any of them may be missing (handled by callers).
import { env } from "cloudflare:workers";

export type TelephonyEnv = {
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_SMS_FROM?: string;
  TWILIO_WEBHOOK_TOKEN?: string;
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_WEBHOOK_SECRET?: string;
};

export const telEnv = () => env as unknown as TelephonyEnv;
