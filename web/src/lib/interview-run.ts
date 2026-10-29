// « Documentation par questions », I/O part: asks Workers AI (same models and fallback as the website scan)
// for the questions the artisan's site did not answer. Falls back to a fixed list when the AI is not available.
import { env } from "cloudflare:workers";
import { parseLlmJson } from "./scan";
import { SCAN_MODELS } from "./scan-run";
import { buildInterviewInput, fallbackQuestions, INTERVIEW_SYSTEM, parseInterview, type InterviewContext, type InterviewQuestion } from "./interview";

export async function interviewQuestions(c: InterviewContext): Promise<{ questions: InterviewQuestion[]; model: string | null; error?: string }> {
  const ai = (env as unknown as { AI?: Ai }).AI;
  if (!ai) return { questions: fallbackQuestions(c), model: null, error: "no_ai_binding" };
  let lastError = "";
  for (const model of SCAN_MODELS) {
    try {
      const out = await (ai.run as (m: string, i: unknown) => Promise<unknown>)(model, {
        messages: [{ role: "system", content: INTERVIEW_SYSTEM }, { role: "user", content: buildInterviewInput(c) }],
        response_format: { type: "json_object" },
        chat_template_kwargs: { enable_thinking: false },
        max_tokens: 800,
        temperature: 0.3,
      });
      const o = out as { response?: unknown; choices?: { message?: { content?: unknown } }[] };
      const data = parseLlmJson(o.response ?? o.choices?.[0]?.message?.content ?? null);
      if (data && Array.isArray(data.questions) && data.questions.length) return { questions: parseInterview(data, c), model };
      lastError = "unparseable_json";
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  console.log(JSON.stringify({ event: "interview.ai_fallback", error: lastError.slice(0, 300) }));
  return { questions: fallbackQuestions(c), model: null, error: lastError };
}
