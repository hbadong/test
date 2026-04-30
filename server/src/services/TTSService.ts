import { logger } from '../utils/logger';

export interface TTSConfig {
  provider: 'default' | 'azure' | 'aliyun' | 'mock';
  apiKey: string;
  voice: string;
  speed: string;
}

export interface TTSResult {
  audioUrl: string;
  duration: number; // seconds
}

class TTSService {
  private config: TTSConfig | null = null;

  updateConfig(config: TTSConfig) {
    this.config = config;
  }

  getConfig(): TTSConfig | null {
    return this.config;
  }

  async synthesize(text: string, options?: { voice?: string; speed?: string }): Promise<TTSResult> {
    if (!this.config) {
      throw new Error('TTS 服务未配置');
    }

    if (this.config.provider === 'mock' || !this.config.apiKey) {
      return this.mockSynthesize(text);
    }

    // Azure TTS integration placeholder
    if (this.config.provider === 'azure') {
      return this.mockSynthesize(text);
    }

    // Aliyun TTS integration placeholder
    if (this.config.provider === 'aliyun') {
      return this.mockSynthesize(text);
    }

    return this.mockSynthesize(text);
  }

  private async mockSynthesize(text: string): Promise<TTSResult> {
    const duration = Math.max(1, Math.ceil(text.length / 15));
    const audioUrl = `/api/tts/mock/${Buffer.from(text).toString('base64')}`;
    return { audioUrl, duration };
  }
}

export const ttsService = new TTSService();
