// Website scan, I/O part: fetches a few pages and asks Workers AI to extract the business.
import { env } from "cloudflare:workers";
import { EXTRACTION_SYSTEM, heuristicExtraction, htmlToText, normalizeExtraction, parseLlmJson, pickLinks, type ScanResult } from "./scan";

const PAGE_TIMEOUT_MS = 6000;
const MAX_HTML_BYTES = 500_000;
const MAX_EXTRA_PAGES = 4;
const LLM_INPUT_CHARS = 24_000;
// Gemma 4 handles French well and supports JSON output; Mistral Small as a second try
export const SCAN_MODELS = ["@cf/google/gemma-4-26b-a4b-it", "@cf/mistralai/mistral-small-3.1-24b-instruct"] as const;

type Page = { url: string; title: string; text: string; html: string };

async function fetchPage(url: string): Promise<Page | null> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AssistantArtisanBot/1.0)", Accept: "text/html", "Accept-Language": "fr-FR,fr;q=0.9" },
    });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) return null;
    // Read at most MAX_HTML_BYTES, then stop downloading
    const reader = res.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < MAX_HTML_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.byteLength;
    }
    await reader.cancel().catch(() => {});
    const html = new TextDecoder().decode(concat(chunks).slice(0, MAX_HTML_BYTES));
    const { title, text } = htmlToText(html);
    return { url: res.url || url, title, text, html };
  } catch {
    return null;
  }
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.byteLength; }
  return out;
}

async function askAi(input: string): Promise<{ data: Record<string, unknown> | null; model: string | null; error?: string }> {
  const ai = (env as unknown as { AI?: Ai }).AI;
  if (!ai) return { data: null, model: null, error: "no_ai_binding" };
  let lastError = "";
  for (const model of SCAN_MODELS) {
    try {
      const out = await (ai.run as (m: string, i: unknown) => Promise<unknown>)(model, {
        messages: [{ role: "system", content: EXTRACTION_SYSTEM }, { role: "user", content: input }],
        response_format: { type: "json_object" },
        chat_template_kwargs: { enable_thinking: false },
        max_tokens: 3000,
        temperature: 0.1,
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

export async function scanWebsite(url: URL): Promise<{ result: ScanResult; pages: string[]; ai: { model: string | null; error?: string } } | null> {
  const home = await fetchPage(url.toString());
  if (!home) return null;
  const extra = (await Promise.all(pickLinks(home.html, home.url, MAX_EXTRA_PAGES).map(fetchPage))).filter((p): p is Page => !!p);
  const pages = [home, ...extra];
  const fallback = heuristicExtraction(pages, url.hostname);

  let input = `Site : ${url.toString()}\n\n`;
  for (const p of pages) {
    const block = `=== PAGE : ${p.url}\nTITRE : ${p.title}\n${p.text}\n\n`;
    if (input.length + block.length > LLM_INPUT_CHARS) { input += block.slice(0, Math.max(0, LLM_INPUT_CHARS - input.length)); break; }
    input += block;
  }
  const { data, model, error } = await askAi(input);
  const result = data ? normalizeExtraction(data, fallback) : fallback;
  if (error) console.log(JSON.stringify({ event: "scan.ai_fallback", error: error.slice(0, 300) }));
  return { result, pages: pages.map((p) => p.url), ai: { model, ...(error && !data ? { error } : {}) } };
}
