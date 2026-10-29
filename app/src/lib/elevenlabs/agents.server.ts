import { elRequest, isDemoMode } from "./client.server";

export interface AgentConfigInput {
  name: string;
  voiceId: string;
  firstMessage: string;
  prompt: string;
  language: string;
  knowledgeBase?: { type: "text" | "url" | "file"; id: string; name: string }[];
  maxDurationSeconds?: number;
  tools?: unknown[];
}

export interface AgentRecord {
  agent_id: string;
  name: string;
}

function buildConversationConfig(input: AgentConfigInput) {
  return {
    agent: {
      first_message: input.firstMessage,
      language: input.language,
      prompt: {
        prompt: input.prompt,
        llm: "gemini-2.5-flash",
        temperature: 0.3,
        knowledge_base: input.knowledgeBase ?? [],
        tools: input.tools ?? [],
      },
    },
    tts: {
      voice_id: input.voiceId,
      // English agents must use a v2 turbo/flash model; other languages use the multilingual v2.5 flash model.
      model_id: input.language === "en" ? "eleven_flash_v2" : "eleven_flash_v2_5",
      stability: 0.5,
      similarity_boost: 0.8,
    },
    conversation: {
      max_duration_seconds: input.maxDurationSeconds ?? 600,
    },
  };
}

export async function createAgent(input: AgentConfigInput): Promise<AgentRecord> {
  if (isDemoMode()) {
    return { agent_id: `mock_agent_${crypto.randomUUID().slice(0, 8)}`, name: input.name };
  }
  const res = await elRequest<{ agent_id: string }>("/v1/convai/agents/create", {
    method: "POST",
    body: { name: input.name, conversation_config: buildConversationConfig(input) },
    timeoutMs: 30000,
  });
  return { agent_id: res.agent_id, name: input.name };
}

export async function updateAgent(agentId: string, input: AgentConfigInput): Promise<void> {
  if (isDemoMode()) return;
  await elRequest(`/v1/convai/agents/${agentId}`, {
    method: "PATCH",
    body: { name: input.name, conversation_config: buildConversationConfig(input) },
    timeoutMs: 30000,
  });
}

export async function deleteAgent(agentId: string): Promise<void> {
  if (isDemoMode()) return;
  await elRequest(`/v1/convai/agents/${agentId}`, { method: "DELETE" });
}

export async function getAgent(agentId: string): Promise<unknown> {
  if (isDemoMode()) return { agent_id: agentId, mock: true };
  return elRequest(`/v1/convai/agents/${agentId}`);
}

export async function listAgents(): Promise<unknown> {
  if (isDemoMode()) return { agents: [] };
  return elRequest(`/v1/convai/agents?page_size=100`);
}

export async function getConversationToken(agentId: string): Promise<{ token: string; mock?: boolean }> {
  if (isDemoMode()) return { token: "", mock: true };
  const res = await elRequest<{ token: string }>(
    `/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
    { timeoutMs: 10000 },
  );
  return { token: res.token };
}

export async function createKnowledgeText(name: string, text: string): Promise<{ id: string; name: string }> {
  if (isDemoMode()) return { id: `mock_kb_${crypto.randomUUID().slice(0, 8)}`, name };
  const res = await elRequest<{ id: string; name: string }>("/v1/convai/knowledge-base/text", {
    method: "POST",
    body: { name, text },
    timeoutMs: 30000,
  });
  return { id: res.id, name: res.name ?? name };
}
