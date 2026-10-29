import { getRequest } from "@tanstack/react-start/server";
import type { Db } from "@/lib/org/org.server";
import { loadBusinessProfile } from "@/lib/org/org.server";
import { AppError, log } from "@/lib/server/errors.server";
import { generateSystemPrompt } from "./prompt.server";

/**
 * Build the canonical config for a receptionist and push it to ElevenLabs.
 * Used for both creation and every subsequent update — one source of truth.
 */
export async function publishReceptionist(
  db: Db,
  receptionistId: string,
  opts: { create?: boolean } = {},
) {
  const { ElevenLabsService } = await import("@/lib/elevenlabs/index.server");
  const { data: rec, error } = await db
    .from("receptionists")
    .select("*, voices(*), receptionist_settings(*)")
    .eq("id", receptionistId)
    .single();
  if (error || !rec) throw new AppError("Receptionist not found.", { status: 404, cause: error });

  const business = await loadBusinessProfile(db, rec.organization_id);
  if (!business)
    throw new AppError("Add your business details before creating a receptionist.", {
      status: 400,
    });
  const voice = rec.voices as { elevenlabs_voice_id: string; name: string } | null;
  if (!voice) throw new AppError("Choose a voice for your receptionist.", { status: 400 });
  const settings = (
    Array.isArray(rec.receptionist_settings)
      ? rec.receptionist_settings[0]
      : rec.receptionist_settings
  ) as {
    appointment_booking_enabled: boolean;
    call_transfer_enabled: boolean;
    transfer_destinations: unknown;
    voicemail_enabled: boolean;
    max_call_duration: number;
  } | null;

  const prompt = generateSystemPrompt({
    business,
    receptionist: {
      name: rec.name,
      personality: rec.personality,
      tone: rec.tone,
      language: rec.language,
      custom_instructions: rec.custom_instructions,
      after_hours_greeting: rec.after_hours_greeting,
    },
    settings: {
      appointment_booking_enabled: settings?.appointment_booking_enabled ?? true,
      call_transfer_enabled: settings?.call_transfer_enabled ?? false,
      transfer_destinations: (settings?.transfer_destinations as never[]) ?? [],
      voicemail_enabled: settings?.voicemail_enabled ?? true,
    },
  });

  const agentInput = {
    name: `${business.business_name} — ${rec.name}`,
    voiceId: voice.elevenlabs_voice_id,
    firstMessage:
      rec.greeting ?? `Hi! Thanks for calling ${business.business_name}. How can I help you today?`,
    prompt,
    language: rec.language,
    maxDurationSeconds: settings?.max_call_duration ?? 600,
    tools: (settings?.appointment_booking_enabled ?? true) ? bookingTools(rec.id) : [],
  };

  await db
    .from("receptionists")
    .update({ status: "creating_agent", status_message: null, system_prompt: prompt })
    .eq("id", rec.id);
  try {
    let agentId = rec.elevenlabs_agent_id;
    if (!agentId || opts.create) {
      const created = await ElevenLabsService.createAgent(agentInput);
      agentId = created.agent_id;
    } else {
      await ElevenLabsService.updateAgent(agentId, agentInput);
    }
    const nextStatus = rec.status === "live" ? "live" : "agent_ready";
    await db
      .from("receptionists")
      .update({
        elevenlabs_agent_id: agentId,
        status: nextStatus,
        status_message: null,
        config_version: rec.config_version + 1,
        last_published_at: new Date().toISOString(),
      })
      .eq("id", rec.id);
    log("receptionist.published", {
      receptionist_id: rec.id,
      org_id: rec.organization_id,
      agent_id: agentId,
    });
    return { agentId, status: nextStatus };
  } catch (e) {
    const err = new AppError(
      "We couldn't finish creating your receptionist. Your details are saved — try again in a moment.",
      {
        cause: e,
        context: { receptionist_id: rec.id },
      },
    );
    await db
      .from("receptionists")
      .update({ status: "error", status_message: `${err.userMessage} (ref ${err.errorId})` })
      .eq("id", rec.id);
    throw err;
  }
}

const PROJECT_ID = "c55f415b-8636-4273-bce3-382322a9dc14";

/** Receptionist tools must reach a public URL; map preview/local hosts to the stable preview host. */
function toolsBaseUrl() {
  try {
    const origin = new URL(getRequest().url).origin;
    const host = new URL(origin).hostname;
    if (
      host === "localhost" ||
      host.startsWith("id-preview--") ||
      host.endsWith(".lovableproject.com")
    ) {
      return `https://project--${PROJECT_ID}-dev.lovable.app`;
    }
    return origin;
  } catch {
    return `https://project--${PROJECT_ID}.lovable.app`;
  }
}

function bookingTools(receptionistId: string) {
  const token = process.env["RECEPTIONIST_TOOL_TOKEN"];
  if (!token) return [];
  const base = `${toolsBaseUrl()}/api/public/receptionist/tools?token=${encodeURIComponent(token)}&rid=${receptionistId}`;
  return [
    {
      type: "webhook",
      name: "check_availability",
      description:
        "Get today's date and the business's open appointment times. Call before offering any time.",
      api_schema: {
        url: `${base}&action=availability`,
        method: "POST",
        request_body_schema: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description:
                "Day the caller wants, as YYYY-MM-DD. Leave empty for the next few days.",
            },
            duration_minutes: {
              type: "number",
              description: "Length of the appointment in minutes if known, otherwise 30.",
            },
          },
          required: [],
        },
      },
    },
    {
      type: "webhook",
      name: "book_appointment",
      description:
        "Book an appointment at a start time returned by check_availability. Only confirm to the caller if the result has confirmed true.",
      api_schema: {
        url: `${base}&action=book`,
        method: "POST",
        request_body_schema: {
          type: "object",
          properties: {
            start: {
              type: "string",
              description: "Exact start value from check_availability (ISO time).",
            },
            caller_name: { type: "string", description: "Caller's full name." },
            caller_phone: { type: "string", description: "Caller's phone number." },
            service: { type: "string", description: "Service the caller wants." },
            notes: { type: "string", description: "Anything else the team should know." },
          },
          required: ["start", "caller_name", "caller_phone"],
        },
      },
    },
  ];
}
