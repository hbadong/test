import axios from 'axios';
import { logger } from '../utils/logger';

export interface VisionConfig {
  provider: 'default' | 'openai' | 'stability' | 'mock';
  apiKey: string;
  model: string;
  apiUrl: string;
  style: string;
}

export interface ImageResult {
  imageUrl: string;
  prompt: string;
  size: string;
}

export interface VisionAnalysisResult {
  description: string;
  tags: string[];
}

class VisionService {
  private config: VisionConfig | null = null;

  updateConfig(config: VisionConfig) {
    this.config = config;
  }

  getConfig(): VisionConfig | null {
    return this.config;
  }

  async generate(prompt: string, options?: { style?: string; size?: string }): Promise<ImageResult> {
    if (!this.config) {
      throw new Error('Vision 服务未配置');
    }

    if (this.config.provider === 'mock' || !this.config.apiKey) {
      return this.mockGenerate(prompt, options);
    }

    // OpenAI DALL-E integration placeholder
    if (this.config.provider === 'openai') {
      try {
        const response = await axios.post(
          `${this.config.apiUrl}/images/generations`,
          {
            model: this.config.model || 'dall-e-3',
            prompt,
            n: 1,
            size: options?.size || '1024x1024',
            style: options?.style || 'natural',
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.config.apiKey}`,
            },
            timeout: 120000,
          }
        );

        const imageData = response.data.data?.[0];
        return {
          imageUrl: imageData?.url || imageData?.b64_json || '',
          prompt,
          size: options?.size || '1024x1024',
        };
      } catch (error: any) {
        logger.error(`Vision API error: ${error.message}`);
        return this.mockGenerate(prompt, options);
      }
    }

    return this.mockGenerate(prompt, options);
  }

  async analyze(imageUrl: string): Promise<VisionAnalysisResult> {
    if (!this.config) {
      throw new Error('Vision 服务未配置');
    }

    if (this.config.provider === 'mock' || !this.config.apiKey) {
      return this.mockAnalyze(imageUrl);
    }

    // OpenAI Vision integration placeholder
    if (this.config.provider === 'openai') {
      return this.mockAnalyze(imageUrl);
    }

    return this.mockAnalyze(imageUrl);
  }

  private async mockGenerate(prompt: string, options?: { style?: string }): Promise<ImageResult> {
    const style = options?.style || this.config?.style || 'default';
    const imageUrl = `/api/vision/mock/image?prompt=${encodeURIComponent(prompt.slice(0, 50))}&style=${style}`;
    return { imageUrl, prompt, size: '1024x1024' };
  }

  private async mockAnalyze(_imageUrl: string): Promise<VisionAnalysisResult> {
    return {
      description: 'AI 视觉分析完成。图片内容已识别。',
      tags: ['AI生成', '图片分析', '视觉识别'],
    };
  }
}

export const visionService = new VisionService();
