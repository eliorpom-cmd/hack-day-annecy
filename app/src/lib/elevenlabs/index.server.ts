/**
 * ElevenLabsService — the single entry point for all ElevenLabs Agents API calls.
 * Never import this from client code. Never spread raw fetches elsewhere.
 */
import * as agents from "./agents.server";
import * as conversations from "./conversations.server";
import * as phoneNumbers from "./phoneNumbers.server";
import { isDemoMode } from "./client.server";

export const ElevenLabsService = {
  isDemoMode,
  createAgent: agents.createAgent,
  updateAgent: agents.updateAgent,
  deleteAgent: agents.deleteAgent,
  getAgent: agents.getAgent,
  listAgents: agents.listAgents,
  getConversationToken: agents.getConversationToken,
  createKnowledgeText: agents.createKnowledgeText,
  importPhoneNumber: phoneNumbers.importPhoneNumber,
  assignPhoneNumber: phoneNumbers.assignPhoneNumber,
  removePhoneNumber: phoneNumbers.removePhoneNumber,
  listPhoneNumbers: phoneNumbers.listPhoneNumbers,
  listConversations: conversations.listConversations,
  getConversation: conversations.getConversation,
  getConversationSummary: conversations.getConversationSummary,
  getConversationAudio: conversations.getConversationAudio,
};

export type { AgentConfigInput } from "./agents.server";
