// Shared Workers AI call returning JSON, with model fallback (same models as the site scan).
import { env } from "cloudflare:workers";
import { parseLlmJson } from "./scan";

export const AI_MODELS = ["@cf/google/gemma-4-26b-a4b-it", "@cf/mistralai/mistral-small-3.1-24b-instruct"] as const;

export async function askJson(
  system: string,
  user: string,
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<{ data: Record<string, unknown> | null; model: string | null; error?: string }> {
  const ai = (env as unknown as { AI?: Ai }).AI;
  if (!ai) return { data: null, model: null, error: "no_ai_binding" };
  let lastError = "";
  for (const model of AI_MODELS) {
    try {
      const out = await (ai.run as (m: string, i: unknown) => Promise<unknown>)(model, {
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        response_format: { type: "json_object" },
        chat_template_kwargs: { enable_thinking: false },
        max_tokens: opts.maxTokens ?? 1500,
        temperature: opts.temperature ?? 0.4,
      });
      const o = out as { response?: unknown; choices?: { message?: { content?: unknown } }[] };
      const data = parseLlmJson(o.response ?? o.choices?.[0]?.message?.content ?? null);
      if (data) return { data, model };
      lastError = "unparseable_json";
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  return { data: null, model: null, error: lastError };
}
