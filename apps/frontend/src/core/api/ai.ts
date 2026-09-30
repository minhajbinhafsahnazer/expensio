/**
 * core/api/ai.ts
 *
 * Frontend service for the Wazn AI chat endpoint.
 *
 * Security notes:
 *   - The AI API key lives ONLY on the backend. This file never touches it.
 *   - System prompts are never sent from the frontend.
 *   - All requests go through the existing authenticated `client` instance.
 */

import { client } from './client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const AiApi = {
  /**
   * Sends a conversation to the Wazn chat endpoint and returns the assistant reply.
   *
   * @param messages - Conversation history (user + assistant only).
   * @returns The assistant's response text.
   * @throws ApiError | NetworkError on failure.
   */
  async chat(messages: ChatMessage[]): Promise<string> {
    const res = await client.post<{ message: string }>('/ai/chat', { messages });
    return res.data.message;
  },
};
