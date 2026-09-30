/**
 * ai/provider.ts
 *
 * LLM provider abstraction.
 *
 * Active provider is selected by AI_PROVIDER env var:
 *   "gemini"  (default) → Google Gemini REST API
 *   "openai"            → OpenAI-compatible API
 *
 * Supported env vars:
 *   GEMINI_API_KEY  or  AI_API_KEY
 *   GEMINI_MODEL    or  AI_MODEL
 *   AI_PROVIDER
 *   AI_BASE_URL     (OpenAI only)
 */

import { logger } from '../../common/lib/logger.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMProvider {
  chat(messages: ChatMessage[]): Promise<string>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Read a key from multiple possible env var names, first match wins. */
function readEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const v = process.env[name];
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}

/** Map user-supplied model names to known-valid Gemini model identifiers. */
const GEMINI_MODEL_ALIASES: Record<string, string> = {
  'gemini-flash-latest':  'gemini-1.5-flash',
  'gemini-3.8-flash':    'gemini-flash-latest',
  'gemini-3.0-flash':    'gemini-1.5-flash',
  'gemini-2.0-flash':    'gemini-2.0-flash-exp',
  
};

// ─── Gemini Implementation ────────────────────────────────────────────────────

class GeminiProvider implements LLMProvider {
  private readonly apiKey: string;
  private readonly model: string;

  constructor() {
    const key = readEnv('GEMINI_API_KEY', 'AI_API_KEY');
    if (!key) throw new Error('No Gemini API key found. Set GEMINI_API_KEY or AI_API_KEY in .env');
    this.apiKey = key;

    const requested = readEnv('GEMINI_MODEL', 'AI_MODEL') ?? 'gemini-1.5-flash';
    this.model = GEMINI_MODEL_ALIASES[requested] ?? requested;
    logger.info('GeminiProvider initialised');
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const systemMsg = messages.find((m) => m.role === 'system');
    const convoMsgs = messages.filter((m) => m.role !== 'system');

    const contents: { role: string; parts: { text: string }[] }[] = [];

    if (systemMsg) {
      contents.push({ role: 'user',  parts: [{ text: systemMsg.content }] });
      contents.push({ role: 'model', parts: [{ text: 'Understood.' }] });
    }

    for (const msg of convoMsgs) {
      contents.push({
        role:  msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    let response: Response;
    try {
      response = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
        body: JSON.stringify({
          contents,
          generationConfig: { maxOutputTokens: 1024, temperature: 0.5 },
        }),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') throw new Error('AI provider request timed out');
      throw new Error('Failed to reach AI provider');
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      logger.error('Gemini API error: ' + response.status + ' ' + body);
      if (response.status === 429) throw new Error('AI provider rate limit reached. Please try again.');
      if (response.status === 400) throw new Error(`Gemini rejected the request (400): ${body.slice(0, 200)}`);
      if (response.status === 404) throw new Error(`Gemini model not found: ${this.model}`);
      throw new Error(`AI provider error (${response.status})`);
    }

    let data: { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    try { data = await response.json(); } catch { throw new Error('AI provider returned invalid JSON'); }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) throw new Error('AI provider returned an empty response');
    return text;
  }
}

// ─── OpenAI-compatible Implementation ────────────────────────────────────────

class OpenAIProvider implements LLMProvider {
  private readonly apiKey:  string;
  private readonly model:   string;
  private readonly baseUrl: string;

  constructor() {
    const key = readEnv('AI_API_KEY');
    if (!key) throw new Error('AI_API_KEY is not configured.');
    this.apiKey  = key;
    this.model   = readEnv('AI_MODEL')    ?? 'gpt-4o-mini';
    this.baseUrl = readEnv('AI_BASE_URL') ?? 'https://api.openai.com/v1';
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
        body: JSON.stringify({ model: this.model, messages, max_tokens: 1024, temperature: 0.5 }),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') throw new Error('AI provider request timed out');
      throw new Error('Failed to reach AI provider');
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      logger.error('OpenAI API error: ' + response.status + ' ' + body);
      if (response.status === 429) throw new Error('AI provider rate limit reached. Please try again.');
      throw new Error(`AI provider error (${response.status})`);
    }
    let data: { choices?: { message?: { content?: string } }[] };
    try { data = await response.json(); } catch { throw new Error('AI provider returned invalid JSON'); }
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('AI provider returned an empty response');
    return text;
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createLLMProvider(): LLMProvider {
  const provider = (readEnv('AI_PROVIDER') ?? 'gemini').toLowerCase();
  if (provider === 'openai') return new OpenAIProvider();
  return new GeminiProvider();
}



