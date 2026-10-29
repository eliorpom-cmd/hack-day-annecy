import { retry, withTimeout } from "@/lib/server/errors.server";

export const ELEVENLABS_BASE = "https://api.elevenlabs.io";

export class ElevenLabsHttpError extends Error {
  constructor(
    public status: number,
    public body: string,
    public path: string,
  ) {
    super(`ElevenLabs ${status} on ${path}`);
  }
}

export function isDemoMode() {
  return process.env["DEMO_MODE"] === "true" || !process.env["ELEVENLABS_API_KEY"];
}

function apiKey() {
  const key = process.env["ELEVENLABS_API_KEY"];
  if (!key) throw new Error("ELEVENLABS_API_KEY is not configured");
  return key;
}

export async function elRequest<T>(
  path: string,
  init: { method?: string; body?: unknown; timeoutMs?: number; raw?: boolean } = {},
): Promise<T> {
  const started = Date.now();
  const res = await retry(
    () =>
      withTimeout(
        fetch(`${ELEVENLABS_BASE}${path}`, {
          method: init.method ?? "GET",
          headers: {
            "xi-api-key": apiKey(),
            ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
          },
          body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
        }),
        init.timeoutMs ?? 20000,
        `ElevenLabs ${path}`,
      ).then(async (r) => {
        if (!r.ok) {
          const text = await r.text();
          throw new ElevenLabsHttpError(r.status, text, path);
        }
        return r;
      }),
    3,
  );
  console.log(
    JSON.stringify({ level: "info", event: "elevenlabs.request", path, ms: Date.now() - started }),
  );
  if (init.raw) return res as unknown as T;
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
