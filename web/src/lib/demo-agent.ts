// Demo calls go to the ElevenLabs agent the team tuned by hand (« Assistant Plomberie Martin FINAL »: model, voice,
// prompt chosen on ElevenLabs), not to the agent the app builds from the setup. The app never edits that agent.
// The setup still saves everything and still builds its own agent, so nothing changes on screen.
// One click back: /app/agent-demo switches between « final » (default) and « app » (the agent built by the app).
import { db } from "./db";
import { elRequest } from "./elevenlabs";
import { secret } from "./env";
import { isFinalAgentName } from "./demo-setup";

const MODE_KEY = "demo_agent_mode";
const ID_KEY = "demo_agent_id";
export type DemoAgentMode = "final" | "app";


async function setting(key: string): Promise<string | null> {
  const row = await db().prepare("SELECT value FROM app_settings WHERE key = ?").bind(key).first<{ value: string }>();
  return row?.value ?? null;
}
async function saveSetting(key: string, value: string): Promise<void> {
  await db().prepare("INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = unixepoch()")
    .bind(key, value).run();
}

export async function demoAgentMode(): Promise<DemoAgentMode> {
  return (await setting(MODE_KEY)) === "app" ? "app" : "final";
}
export async function setDemoAgentMode(mode: DemoAgentMode): Promise<void> {
  await saveSetting(MODE_KEY, mode);
}

// The FINAL agent: the DEMO_AGENT_ID secret, else the one found by name on the account (remembered after the first
// lookup; `refresh` looks again)
export async function finalAgent(refresh = false): Promise<{ id: string; name: string | null } | null> {
  const fixed = secret("DEMO_AGENT_ID");
  if (fixed) return { id: fixed, name: null };
  if (!refresh) {
    const cached = await setting(ID_KEY);
    if (cached) { const [id, ...name] = cached.split("|"); return { id: id!, name: name.join("|") || null }; }
  }
  if (!secret("ELEVENLABS_API_KEY")) return null;
  const data = await elRequest<{ agents?: { agent_id: string; name: string }[] }>("/v1/convai/agents?page_size=100", { timeoutMs: 6000 }).catch(() => null);
  const hit = (data?.agents ?? []).find((a) => isFinalAgentName(a.name ?? ""));
  if (!hit) return null;
  await saveSetting(ID_KEY, `${hit.agent_id}|${hit.name}`);
  return { id: hit.agent_id, name: hit.name };
}

// Agent that answers a call of a demo account: the FINAL one in « final » mode, else null (the app's own agent)
export async function demoCallAgentId(): Promise<string | null> {
  if ((await demoAgentMode()) !== "final") return null;
  return (await finalAgent())?.id ?? null;
}
