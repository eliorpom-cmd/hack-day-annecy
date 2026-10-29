// Default greeting the caller hears when the answering service picks up (COPY.md « Répondeur au téléphone »).
// Pure: shared by the setup page, the API and the agent prompt. Tested in test/greeting.test.ts.

export type VoiceGender = "female" | "male";
// "cloned" = the artisan's own voice: he answers as himself
export type GreetingVoice = "cloned" | VoiceGender | null;

const NBSP = " ";

export function cleanFirstName(raw: string | null | undefined): string {
  return (raw ?? "").trim().replace(/\s+/g, " ");
}

export function defaultGreeting(o: { name: string; first_name?: string | null; voice: GreetingVoice }): string {
  const name = o.name.trim() || "l’entreprise";
  if (o.voice === "cloned") return `Oui allô, ${name}.`;
  const who = cleanFirstName(o.first_name) || "L’artisan";
  const assistant = o.voice === "female" ? "l’assistante" : "l’assistant";
  return `Bonjour, ici ${assistant} de ${name}. ${who} est sur un chantier, que puis-je faire pour vous${NBSP}?`;
}

// True when the text is one of the generated greetings (any voice, any name, older wording included):
// those follow the voice choice, a greeting the artisan wrote himself is never replaced.
export function isDefaultGreeting(text: string | null | undefined): boolean {
  const g = (text ?? "").trim();
  if (!g) return true;
  if (/^Oui allô, .+\.$/.test(g)) return true;
  return /^Bonjour, ici l[’']assistante? de .+\. .+ est sur un chantier, que puis-je faire pour vous\s?\?$/.test(g);
}
