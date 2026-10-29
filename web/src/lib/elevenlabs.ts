// ElevenLabs REST calls (voices, Conversational AI agents). Needs ELEVENLABS_API_KEY.
import { secret } from "./env";
import { HttpError } from "./http";

const BASE = "https://api.elevenlabs.io";

export function elevenLabsKey(): string {
  const key = secret("ELEVENLABS_API_KEY");
  if (!key) throw new HttpError(503, "elevenlabs_not_configured", "La clé ElevenLabs n'est pas configurée : ajoutez ELEVENLABS_API_KEY dans web/.dev.vars (ou wrangler secret put).");
  return key;
}

export async function elRequest<T>(path: string, init: { method?: string; body?: unknown; timeoutMs?: number } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: init.method ?? "GET",
      headers: { "xi-api-key": elevenLabsKey(), ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(init.timeoutMs ?? 20000),
    });
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(502, "elevenlabs_unreachable", "ElevenLabs ne répond pas. Réessayez dans un instant.");
  }
  if (!res.ok) {
    const body = (await res.text()).slice(0, 500);
    console.error(JSON.stringify({ event: "elevenlabs.error", path, status: res.status, body }));
    throw new HttpError(res.status === 401 ? 503 : 502, "elevenlabs_error",
      res.status === 401 ? "La clé ElevenLabs est refusée : vérifiez ELEVENLABS_API_KEY." : `ElevenLabs a refusé la demande (${res.status}).`,
      { detail: body, upstream_status: res.status });
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
