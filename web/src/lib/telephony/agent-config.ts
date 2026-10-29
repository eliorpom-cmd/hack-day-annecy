// What the ElevenLabs agent must collect during a call, read back by the post-call webhook.
// Pure module: import it from the agent-creation code (src/lib/elevenlabs/).

export const URGENCY_VALUES = ["urgence", "urgent", "normal"] as const;
export type Urgency = (typeof URGENCY_VALUES)[number];

export type DataCollectionField = {
  type: "string";
  description: string;
  enum?: readonly string[];
};

// Shape of ElevenLabs `platform_settings.data_collection` (key = data_collection_id)
export const DATA_COLLECTION: Record<
  "name" | "phone" | "address" | "subject" | "need" | "urgency" | "urgency_reason",
  DataCollectionField
> = {
  name: { type: "string", description: "Nom et prénom de l'appelant, tels qu'il les donne." },
  phone: {
    type: "string",
    description: "Numéro de téléphone où rappeler l'appelant, au format international si possible (+33…). Vide s'il n'en donne pas.",
  },
  address: { type: "string", description: "Adresse de l'intervention (rue, ville). Vide si non donnée." },
  subject: { type: "string", description: "L'objet de l'appel en 2 à 4 mots, sans majuscule (ex. : fuite d'eau, chaudière en panne, devis salle de bain)." },
  need: { type: "string", description: "Le besoin de l'appelant en une phrase courte (ex. : fuite sous l'évier)." },
  urgency: {
    type: "string",
    enum: URGENCY_VALUES,
    description:
      "« urgence » si danger ou dégât en cours (fuite importante, plus de chauffage en hiver, panne totale) ; « urgent » à traiter dans les 48 h ; « normal » sinon.",
  },
  urgency_reason: {
    type: "string",
    description:
      "Une phrase courte, en français, qui dit pourquoi l'appel est urgent ou pas (ex. : « Fuite d'eau en cours, risque de dégât. »). Vide si rien à dire.",
  },
};

export const POST_CALL_WEBHOOK_PATH = "/api/elevenlabs/post-call";

// Full URL to register as the post-call (transcription) webhook in ElevenLabs
export function postCallWebhookUrl(appUrl: string): string {
  return new URL(POST_CALL_WEBHOOK_PATH, appUrl).toString();
}

// Voice webhook URL to set on a Twilio number (VoiceUrl, POST)
export function twilioVoiceWebhookUrl(appUrl: string, token: string): string {
  const url = new URL("/api/twilio/voice", appUrl);
  url.searchParams.set("token", token);
  return url.toString();
}
