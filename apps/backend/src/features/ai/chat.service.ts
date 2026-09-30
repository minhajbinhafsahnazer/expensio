/**
 * ai/chat.service.ts
 *
 * Responsibilities:
 *   1. Validate incoming messages.
 *   2. Prepend the Wazn system prompt.
 *   3. Call the LLM provider.
 *   4. Return the assistant's response text.
 *
 * Does NOT contain:
 *   - Database logic
 *   - Financial calculations
 *   - Memory / persistence
 */

import { WAZN_SYSTEM_PROMPT } from './prompt.js';
import { createLLMProvider, type ChatMessage } from './provider.js';
import { BadRequestError } from '../../common/errors/index.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IncomingMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const chatService = {
  /**
   * Processes a chat conversation and returns the assistant's reply.
   *
   * @param messages - The conversation history from the client.
   *                   System messages are rejected; the backend controls the prompt.
   */
  async chat(messages: IncomingMessage[]): Promise<string> {
    // Reject system messages from the frontend — the backend controls the prompt.
    for (const msg of messages) {
      if ((msg.role as string) === 'system') {
        throw new BadRequestError('System messages are not accepted from the client.');
      }
    }

    // Reject empty or whitespace-only messages
    const lastMessage = messages.at(-1);
    if (!lastMessage || !lastMessage.content.trim()) {
      throw new BadRequestError('Message content cannot be empty.');
    }

    // Build the full messages array: system prompt first, then conversation history
    const fullMessages: ChatMessage[] = [
      { role: 'system', content: WAZN_SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role, content: m.content.trim() })),
    ];

    const provider = createLLMProvider();
    return provider.chat(fullMessages);
  },
};
