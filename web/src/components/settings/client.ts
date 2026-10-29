// Browser helpers shared by the « Réglages » edit views: JSON calls, the status line, the agent refresh.
// Texts follow COPY.md: success « Enregistré », errors say what failed and what to do.

export type ApiResult<T> = { ok: boolean; status: number; data: T & { error?: string; hint?: string } };

export async function api<T = Record<string, unknown>>(method: string, url: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data: data as ApiResult<T>["data"] };
  } catch {
    return { ok: false, status: 0, data: { error: "network", hint: "Pas de connexion. Vérifiez votre réseau et réessayez." } as ApiResult<T>["data"] };
  }
}

export const SAVE_FAILED = "Enregistrement impossible. Réessayez dans un instant.";

// Status line of the edit view: « Enregistré », an error, or nothing
export function status(kind: "saved" | "error" | null, text?: string) {
  const ok = document.querySelector<HTMLElement>("[data-status-ok]");
  const err = document.querySelector<HTMLElement>("[data-status-error]");
  if (ok) ok.hidden = kind !== "saved";
  // The répondeur note belongs to the last save only
  const agent = document.querySelector<HTMLElement>("[data-agent-error]");
  if (agent && kind !== "saved") agent.hidden = true;
  if (err) { err.hidden = kind !== "error"; err.textContent = kind === "error" ? (text ?? SAVE_FAILED) : ""; }
}

// The agent learns hours, documentation and greeting from the record: push them after each change.
// A failure never cancels the save, it only shows a plain sentence.
export async function refreshAgent(): Promise<boolean> {
  const box = document.querySelector<HTMLElement>("[data-agent-error]");
  const r = await api("POST", "/api/agent");
  if (box) box.hidden = r.ok;
  return r.ok;
}

// Disables the save button while a request runs
export function busy(btn: HTMLButtonElement | null, on: boolean) {
  if (!btn) return;
  btn.disabled = on;
  btn.style.opacity = on ? "0.6" : "";
}

// Any edit hides the previous « Enregistré »
export function clearOnInput(root: HTMLElement) {
  root.addEventListener("input", () => status(null));
  root.addEventListener("change", () => status(null));
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, ...kids: (Node | string)[]) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  // appendChild: the Workers types shadow the DOM Element.append signature
  for (const k of kids) e.appendChild(typeof k === "string" ? document.createTextNode(k) : k);
  return e;
}

export function icon(name: string): DocumentFragment {
  const t = document.querySelector<HTMLTemplateElement>(`template[data-icon="${name}"]`);
  return (t?.content.cloneNode(true) as DocumentFragment) ?? document.createDocumentFragment();
}

export function readInit<T>(id: string): T {
  return JSON.parse(document.getElementById(id)!.textContent!) as T;
}
