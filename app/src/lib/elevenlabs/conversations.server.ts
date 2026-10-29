import { elRequest, isDemoMode } from "./client.server";

export interface ConversationSummary {
  conversation_id: string;
  agent_id: string;
  start_time_unix_secs: number;
  call_duration_secs: number;
  status: string;
  call_successful?: string;
}

export interface ConversationDetail {
  conversation_id: string;
  agent_id: string;
  status: string;
  transcript: { role: "user" | "agent"; message: string | null; time_in_call_secs: number }[];
  metadata: { start_time_unix_secs: number; call_duration_secs: number; [k: string]: unknown };
  analysis?: {
    transcript_summary?: string;
    call_successful?: "success" | "failure" | "unknown" | "error";
    data_collection_results?: Record<string, unknown>;
    evaluation_criteria_results?: Record<string, unknown>;
  };
  has_audio?: boolean;
}

export async function listConversations(agentId: string, cursor?: string) {
  if (isDemoMode())
    return { conversations: [] as ConversationSummary[], has_more: false, next_cursor: null };
  const q = new URLSearchParams({ agent_id: agentId, page_size: "50" });
  if (cursor) q.set("cursor", cursor);
  return elRequest<{
    conversations: ConversationSummary[];
    has_more: boolean;
    next_cursor: string | null;
  }>(`/v1/convai/conversations?${q.toString()}`);
}

export async function getConversation(conversationId: string) {
  if (isDemoMode()) return null;
  return elRequest<ConversationDetail>(`/v1/convai/conversations/${conversationId}`);
}

export async function getConversationSummary(conversationId: string) {
  const c = await getConversation(conversationId);
  return c?.analysis?.transcript_summary ?? null;
}

export async function getConversationAudio(conversationId: string): Promise<Response | null> {
  if (isDemoMode()) return null;
  return elRequest<Response>(`/v1/convai/conversations/${conversationId}/audio`, {
    raw: true,
    timeoutMs: 30000,
  });
}
