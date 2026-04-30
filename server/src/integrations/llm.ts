import { OpenAI } from 'openai';
import { db } from '../config/database';
import { logger } from '../utils/logger';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMConfig {
  provider: 'openai' | 'qianwen';
  apiKey: string;
  apiUrl: string;
  model: string;
}

function getLLMConfig(): LLMConfig {
  const rows = db.prepare("SELECT key, value FROM settings WHERE key IN ('llm.provider', 'llm.api_key', 'llm.api_url', 'llm.model')").all() as { key: string; value: string }[];
  const config: Record<string, string> = {};
  for (const row of rows) {
    config[row.key.replace('llm.', '')] = row.value;
  }

  return {
    provider: (config.provider as 'openai' | 'qianwen') || 'openai',
    apiKey: config.api_key || '',
    apiUrl: config.api_url || 'https://api.openai.com/v1',
    model: config.model || 'gpt-4',
  };
}

let openaiClient: OpenAI | null = null;

function getClient(): OpenAI {
  const config = getLLMConfig();

  if (openaiClient) return openaiClient;

  if (!config.apiKey) {
    throw new Error('LLM API key not configured. Please set llm.api_key in system settings.');
  }

  openaiClient = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.apiUrl,
  });

  return openaiClient;
}

export async function chatCompletion(
  messages: LLMMessage[],
  options?: { temperature?: number; maxTokens?: number; model?: string }
): Promise<string> {
  const client = getClient();
  const config = getLLMConfig();

  try {
    const response = await client.chat.completions.create({
      model: options?.model || config.model,
      messages: messages as any,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2000,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    logger.error(`LLM API call failed: ${error}`);
    throw error;
  }
}

export async function chatCompletionJSON<T>(
  messages: LLMMessage[],
  options?: { temperature?: number; maxTokens?: number; model?: string }
): Promise<T> {
  const content = await chatCompletion([
    { role: 'system', content: 'You must respond with valid JSON only, no additional text.' },
    ...messages,
  ], options);

  try {
    return JSON.parse(content) as T;
  } catch {
    // Try to extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as T;
    }
    throw new Error(`Failed to parse LLM response as JSON: ${content.substring(0, 200)}`);
  }
}
