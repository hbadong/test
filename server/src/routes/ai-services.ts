import { Router, Request, Response } from 'express';
import { llmService } from '../services/LLMService';
import { ttsService } from '../services/TTSService';
import { visionService } from '../services/VisionService';
import { db } from '../config/database';

const router = Router();

// Get AI service configuration
router.get('/config', (_req: Request, res: Response) => {
  try {
    const llmConfig = llmService.getConfig();
    const ttsConfig = ttsService.getConfig();
    const visionConfig = visionService.getConfig();

    res.json({
      success: true,
      data: {
        llm: llmConfig ? {
          provider: llmConfig.provider,
          model: llmConfig.model,
          configured: !!llmConfig.apiKey,
        } : null,
        tts: ttsConfig ? {
          provider: ttsConfig.provider,
          configured: !!ttsConfig.apiKey,
        } : null,
        vision: visionConfig ? {
          provider: visionConfig.provider,
          configured: !!visionConfig.apiKey,
        } : null,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get AI config' });
  }
});

// Update LLM configuration from settings
router.post('/config/update', (_req: Request, res: Response) => {
  try {
    // Load settings from database
    const settings = db.prepare('SELECT key, value FROM settings').all() as any[];
    const settingsMap: Record<string, string> = {};
    settings.forEach(s => { settingsMap[s.key] = s.value; });

    // Update LLM config
    llmService.updateConfig({
      provider: (settingsMap['llm.provider'] || 'mock') as any,
      apiKey: settingsMap['llm.api_key'] || '',
      model: settingsMap['llm.model'] || 'gpt-4',
      apiUrl: settingsMap['llm.api_url'] || 'https://api.openai.com/v1',
    });

    // Update TTS config
    ttsService.updateConfig({
      provider: (settingsMap['tts.provider'] || 'mock') as any,
      apiKey: settingsMap['tts.api_key'] || '',
      voice: settingsMap['tts.voice'] || 'default',
      speed: settingsMap['tts.speed'] || 'normal',
    });

    // Update Vision config
    visionService.updateConfig({
      provider: (settingsMap['vision.provider'] || 'mock') as any,
      apiKey: settingsMap['vision.api_key'] || '',
      model: settingsMap['vision.model'] || 'dall-e-3',
      apiUrl: settingsMap['vision.api_url'] || 'https://api.openai.com/v1',
      style: settingsMap['vision.style'] || 'natural',
    });

    const llmConfig = llmService.getConfig();
    res.json({
      success: true,
      message: 'AI 服务配置已更新',
      data: {
        llm: llmConfig?.provider || 'mock',
        tts: ttsService.getConfig()?.provider || 'mock',
        vision: visionService.getConfig()?.provider || 'mock',
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: '配置更新失败: ' + error.message });
  }
});

// Test LLM connection
router.post('/test/llm', async (_req: Request, res: Response) => {
  try {
    const result = await llmService.generate('你好，请回复"连接成功"以确认 API 配置正确。');
    res.json({
      success: true,
      data: {
        response: result.text,
        usage: result.usage,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'LLM 测试失败: ' + error.message });
  }
});

// Test TTS
router.post('/test/tts', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    const result = await ttsService.synthesize(text || '这是一段语音测试。');
    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'TTS 测试失败: ' + error.message });
  }
});

// Test Vision (image generation)
router.post('/test/vision', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    const result = await visionService.generate(prompt || 'A beautiful landscape');
    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Vision 测试失败: ' + error.message });
  }
});

// Mock TTS audio endpoint
router.get('/tts/mock/:base64text', (_req: Request, res: Response) => {
  res.json({
    message: 'Mock TTS response',
    note: 'In production, this would return audio data from the configured TTS provider',
  });
});

// Mock Vision image endpoint
router.get('/vision/mock/image', (_req: Request, res: Response) => {
  res.json({
    message: 'Mock Vision response',
    note: 'In production, this would return image data from the configured Vision provider',
  });
});

export default router;
