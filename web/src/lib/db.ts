import { env } from "cloudflare:workers";

export const db = () => env.DB;

export type Business = {
  id: string; owner_id: string; name: string; trade: string; city: string; website: string | null;
  description: string; artisan_phone: string | null; ring_seconds: number; greeting: string;
  voice_id: string | null; voice_name: string | null; first_name: string; voice_gender: "female" | "male" | null; elevenlabs_agent_id: string | null;
  onboarding_step: "business" | "voice" | "number" | "done"; advanced_mode: number; created_at: number;
};

export type User = { id: string; email: string };

export async function businessForUser(userId: string): Promise<Business | null> {
  return db().prepare("SELECT * FROM businesses WHERE owner_id = ?").bind(userId).first<Business>();
}
