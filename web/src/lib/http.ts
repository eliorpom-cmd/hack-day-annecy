// Small JSON helpers shared by the API routes. No Cloudflare import: testable.

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

// Every API error has the same shape: {error, hint}. `error` is a stable code,
// `hint` is a French sentence the UI can show as is.
export function fail(status: number, error: string, hint: string, extra: Record<string, unknown> = {}): Response {
  return Response.json({ error, hint, ...extra }, { status });
}

export class HttpError extends Error {
  constructor(public status: number, public code: string, public hint: string, public extra: Record<string, unknown> = {}) {
    super(code);
  }
}

export function errorResponse(e: unknown): Response {
  if (e instanceof HttpError) return fail(e.status, e.code, e.hint, e.extra);
  console.error(JSON.stringify({ event: "api.error", message: e instanceof Error ? e.message : String(e) }));
  return fail(500, "internal", "Une erreur inattendue s'est produite. Réessayez dans un instant.");
}

// Reads a JSON body; a missing or invalid body becomes a 400, never a crash
export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError(400, "invalid_json", "Le corps de la requête doit être du JSON valide.");
  }
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// Wraps a route handler so thrown HttpErrors become clean JSON responses
export function handle<C>(fn: (ctx: C) => Promise<Response> | Response): (ctx: C) => Promise<Response> {
  return async (ctx: C) => {
    try {
      return await fn(ctx);
    } catch (e) {
      return errorResponse(e);
    }
  };
}
