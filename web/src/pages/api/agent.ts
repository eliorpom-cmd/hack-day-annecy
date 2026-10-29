import type { APIRoute } from "astro";
import { db, type Business } from "../../lib/db";
import { elRequest } from "../../lib/elevenlabs";
import { appUrl, requireBusiness, secret } from "../../lib/env";
import { fail, handle, HttpError, json } from "../../lib/http";
import { buildAgentPayload, buildSystemPrompt, firstMessage, type PromptFaq, type PromptHour } from "../../lib/prompt";
import { isDemoBusiness } from "../../lib/demo-voice";
import { DATA_COLLECTION, postCallWebhookUrl } from "../../lib/telephony/agent-config";

async function promptFor(b: Business) {
  const [hours, faqs] = await Promise.all([
    db().prepare("SELECT weekday, opens, closes FROM business_hours WHERE business_id = ? ORDER BY weekday, opens").bind(b.id).all<PromptHour>(),
    db().prepare("SELECT question, answer, kind FROM faqs WHERE business_id = ? ORDER BY created_at").bind(b.id).all<PromptFaq>(),
  ]);
  // A demo account always books (the pitch script), connected calendar or not
  const calendar = !!b.calendar_connected_at || (await isDemoBusiness(b));
  return buildSystemPrompt(b, hours.results, faqs.results, { calendar });
}

// Preview of what the agent will say and know (advanced mode)
export const GET: APIRoute = handle(async ({ locals }) => {
  const b = requireBusiness(locals);
  return json({ agent_id: b.elevenlabs_agent_id, first_message: firstMessage(b), prompt: await promptFor(b) });
});

// Creates the ElevenLabs agent on first call, updates it afterwards, from the current business record
export const POST: APIRoute = handle(async ({ locals }) => {
  const b = requireBusiness(locals);
  const prompt = await promptFor(b);
  const webhook = postCallWebhookUrl(appUrl());
  if (!secret("ELEVENLABS_API_KEY"))
    return fail(503, "elevenlabs_not_configured", "La clé ElevenLabs n'est pas configurée : ajoutez ELEVENLABS_API_KEY dans web/.dev.vars. Le prompt ci-joint est celui qui sera envoyé.",
      { prompt, first_message: firstMessage(b) });
  const payload = buildAgentPayload({ business: b, prompt, voiceId: b.voice_id, dataCollection: DATA_COLLECTION });

  let agentId = b.elevenlabs_agent_id;
  let created = false;
  if (agentId) {
    try {
      await elRequest(`/v1/convai/agents/${encodeURIComponent(agentId)}`, { method: "PATCH", body: payload, timeoutMs: 30000 });
    } catch (e) {
      // Agent deleted on the ElevenLabs side: create a fresh one
      if (e instanceof HttpError && e.extra.upstream_status === 404) agentId = null;
      else throw e;
    }
  }
  if (!agentId) {
    const res = await elRequest<{ agent_id: string }>("/v1/convai/agents/create", { method: "POST", body: payload, timeoutMs: 30000 });
    agentId = res.agent_id;
    created = true;
    await db().prepare("UPDATE businesses SET elevenlabs_agent_id = ? WHERE id = ?").bind(agentId, b.id).run();
  }
  return json({
    agent_id: agentId,
    created,
    post_call_webhook_url: webhook,
    hint: "Le webhook de fin d'appel se règle une fois pour tout l'espace ElevenLabs (Paramètres → Webhooks) avec l'URL ci-dessus.",
  });
});
