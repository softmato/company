/**
 * Softmato AI Company Assistant — Core Type Definitions
 *
 * Defines message structures, tool parameters, context retrieval shapes,
 * and LLM provider interfaces as specified in Softmato_AI_Company_Assistant_Architecture.docx.
 */

export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ChatMessage {
  id?: string | undefined;
  role: Role;
  content: string;
  name?: string | undefined;
  tool_calls?: ToolCall[] | undefined;
  tool_call_id?: string | undefined;
  timestamp?: number | undefined;
}

export interface ToolParameterProperty {
  type: string;
  description: string;
  enum?: string[] | undefined;
  items?: { type: string } | undefined;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameterProperty>;
    required?: string[] | undefined;
  };
}

export interface RetrievedContext {
  filename: string;
  content: string;
  score: number;
}

export interface AiProviderChatParams {
  messages: ChatMessage[];
  systemPrompt: string;
  context?: RetrievedContext[] | undefined;
  tools?: ToolDefinition[] | undefined;
}

export interface AiProviderResponse {
  message: string;
  toolCalls?: ToolCall[] | undefined;
  finishReason?: 'stop' | 'tool_calls' | 'length' | 'error' | undefined;
  providerName: string;
}

export interface ToolExecutionResult {
  toolName: string;
  success: boolean;
  data?: unknown;
  error?: string | undefined;
}

export interface MeetingSlot {
  date: string; // e.g. "2026-09-02"
  time: string; // e.g. "14:00 NPT"
  available: boolean;
}

export interface BookMeetingParams {
  name: string;
  email: string;
  date: string;
  time: string;
  details?: string | undefined;
}

export interface CreateLeadParams {
  name: string;
  email: string;
  company?: string | undefined;
  requirements: string;
}

export interface ContactHumanParams {
  name: string;
  email: string;
  message: string;
}
