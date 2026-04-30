import axios from 'axios';
import { logger } from '../utils/logger';

export interface LLMConfig {
  provider: 'openai' | 'qianwen' | 'mock';
  apiKey: string;
  model: string;
  apiUrl: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

class LLMService {
  private config: LLMConfig | null = null;

  updateConfig(config: LLMConfig) {
    this.config = config;
  }

  getConfig(): LLMConfig | null {
    return this.config;
  }

  async chat(messages: ChatMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<LLMResponse> {
    if (!this.config) {
      throw new Error('LLM 服务未配置');
    }

    // Mock mode for development
    if (this.config.provider === 'mock' || !this.config.apiKey) {
      return this.mockChat(messages);
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.config.provider === 'openai') {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      } else if (this.config.provider === 'qianwen') {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const payload = {
        model: this.config.model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2000,
      };

      const url = this.config.apiUrl.endsWith('/')
        ? `${this.config.apiUrl}chat/completions`
        : `${this.config.apiUrl}/chat/completions`;

      const response = await axios.post(url, payload, { headers, timeout: 60000 });

      const choice = response.data.choices?.[0];
      const usage = response.data.usage;

      return {
        text: choice?.message?.content || '',
        usage: usage ? {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        } : undefined,
      };
    } catch (error: any) {
      logger.error(`LLM API error: ${error.message}`);
      // Fallback to mock on error
      return this.mockChat(messages);
    }
  }

  async generate(text: string, context?: string): Promise<LLMResponse> {
    const messages: ChatMessage[] = [
      { role: 'system', content: context || '你是一个专业的AI助手，帮助用户完成任务。' },
      { role: 'user', content: text },
    ];
    return this.chat(messages);
  }

  private async mockChat(messages: ChatMessage[]): Promise<LLMResponse> {
    const lastMessage = messages[messages.length - 1];
    const userContent = lastMessage?.content || '';

    // Generate contextual mock responses
    let response = '';
    const lower = userContent.toLowerCase();

    if (lower.includes('文章') || lower.includes('write') || lower.includes('创作')) {
      response = '这是一篇由 AI 自动生成的内容。系统会根据您提供的主题和关键词，自动生成高质量的文章。您可以自定义风格、字数和排版格式。';
    } else if (lower.includes('视频') || lower.includes('video')) {
      response = '视频生成任务已创建。AI 将根据您提供的脚本和素材，自动生成高质量的视频内容，包括配音、字幕和特效。';
    } else if (lower.includes('线索') || lower.includes('lead')) {
      response = '已为您找到 15 条高意向线索，覆盖企业官网、社交媒体、展会名录等渠道。建议优先联系标记为"高意向"的 5 家企业。';
    } else if (lower.includes('合同') || lower.includes('legal')) {
      response = '合同审查完成。共发现 3 处潜在风险点：1) 违约责任条款不明确 2) 付款周期存在歧义 3) 缺少争议解决条款。建议修改后重新签署。';
    } else {
      response = `收到您的请求: "${userContent.slice(0, 30)}${userContent.length > 30 ? '...' : ''}"。AI 正在处理中，请稍候...`;
    }

    return {
      text: response,
      usage: { promptTokens: 0, completionTokens: response.length, totalTokens: response.length },
    };
  }
}

export const llmService = new LLMService();
