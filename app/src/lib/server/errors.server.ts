/** Friendly error wrapper with an internal error id for support/logs. */
export class AppError extends Error {
  public readonly errorId: string;
  public readonly userMessage: string;
  public readonly status: number;
  constructor(
    userMessage: string,
    opts?: { cause?: unknown; status?: number; context?: Record<string, unknown> },
  ) {
    super(userMessage);
    this.name = "AppError";
    this.userMessage = userMessage;
    this.status = opts?.status ?? 500;
    this.errorId = `err_${crypto.randomUUID().slice(0, 8)}`;
    console.error(
      JSON.stringify({
        level: "error",
        error_id: this.errorId,
        message: userMessage,
        cause: opts?.cause instanceof Error ? opts.cause.message : opts?.cause,
        ...opts?.context,
      }),
    );
  }
  toJSON() {
    return { message: this.userMessage, errorId: this.errorId };
  }
}

export function friendly(userMessage: string, cause?: unknown, context?: Record<string, unknown>) {
  if (cause instanceof AppError) return cause;
  return new AppError(userMessage, { cause, context });
}

export function log(event: string, data: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ level: "info", event, ts: new Date().toISOString(), ...data }));
}

export async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    if (t) clearTimeout(t);
  }
}

export async function retry<T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 400): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const status = (e as { status?: number })?.status;
      if (status && status >= 400 && status < 500 && status !== 429) throw e;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** i));
    }
  }
  throw last;
}
