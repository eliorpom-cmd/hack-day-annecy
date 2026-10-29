import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

function createGateway() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");

  return createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey: key,
    headers: {
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}

async function runCompletion(opts: {
  system: string;
  user: string;
  effort?: "low" | "medium" | "high";
}): Promise<string> {
  const gateway = createGateway();
  const started = Date.now();
  const result = streamText({
    model: gateway.responses(MODEL),
    system: opts.system,
    prompt: opts.user,
    maxRetries: 0,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: opts.effort ?? "medium",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  const text = await result.text;
  console.log(
    JSON.stringify({
      level: "info",
      event: "ai.completion",
      model: MODEL,
      ms: Date.now() - started,
    }),
  );
  if (!text.trim()) throw new Error("The website reader returned an empty result");
  return text;
}

/** Extract a JSON object using the workspace's secure OpenAI model connection. */
export async function completeJson<T>(opts: {
  system: string;
  user: string;
  model?: string;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
}): Promise<T> {
  const content = await runCompletion({
    system: `${opts.system}\n\nYour response must be one valid JSON object with no markdown or commentary.`,
    user: `${opts.user}\n\nReturn the result as JSON.`,
    effort: opts.effort,
  });
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  return JSON.parse(cleaned) as T;
}

export async function completeText(opts: {
  system: string;
  user: string;
  model?: string;
}): Promise<string> {
  return runCompletion({ system: opts.system, user: opts.user });
}
