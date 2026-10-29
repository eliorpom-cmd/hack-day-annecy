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

// Name the répondeur says and shows for the business. A self-employed artisan without a company name
// is « {prénom} {nom}, {métier} » (« Marc Durand, plombier »). Used by the greeting, the prompt and the messages.
export function businessDisplayName(b: { name?: string | null; first_name?: string | null; last_name?: string | null; trade?: string | null }): string {
  const company = (b.name ?? "").trim().replace(/\s+/g, " ");
  if (company) return company;
  const person = [cleanFirstName(b.first_name), cleanFirstName(b.last_name)].filter(Boolean).join(" ");
  const trade = (b.trade ?? "").trim().replace(/\s+/g, " ");
  if (person && trade) return `${person}, ${trade.charAt(0).toLowerCase()}${trade.slice(1)}`;
  return person || (trade ? trade.charAt(0).toUpperCase() + trade.slice(1) : "");
}
