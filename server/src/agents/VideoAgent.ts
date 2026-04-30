import { BaseAgent, AgentResult, AgentContext, AgentType } from './BaseAgent';
import { chatCompletion, chatCompletionJSON } from '../integrations/llm';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs';

interface VideoScene {
  text: string;
  visual: string;
  duration: number;
  bgm: string;
}

export class VideoAgent extends BaseAgent {
  readonly type: AgentType = 'video';

  async execute(context: AgentContext): Promise<AgentResult> {
    logger.info('[VideoAgent] Starting video generation...');

    const { script, title, style, ratio, bgm } = context.input as {
      script?: string;
      title?: string;
      style?: string;
      ratio?: '16:9' | '9:16';
      bgm?: string;
    };

    if (!script) {
      return { success: false, error: '脚本或文案不能为空' };
    }

    try {
      // Step 1: Parse script into scenes
      const scenes = await this.parseScript(script);

      // Step 2: Match visuals for each scene
      const scenesWithVisuals = await this.matchVisuals(scenes);

      // Step 3: Generate subtitles
      const subtitles = this.generateSubtitles(scenesWithVisuals);

      // Step 4: Select background music
      const selectedBgm = bgm || this.selectBGM(style);

      // Step 5: Render video (simulated)
      const videoPath = await this.renderVideo(scenesWithVisuals, subtitles, selectedBgm, ratio);

      // Step 6: Store content record
      this.storeVideo(title || script.substring(0, 50), videoPath);

      return {
        success: true,
        data: {
          videoPath,
          duration: scenes.reduce((sum, s) => sum + s.duration, 0),
          scenes: scenes.length,
          subtitles,
          ratio: ratio || '16:9',
        },
        metrics: {
          duration: 0,
          itemsProcessed: scenes.length,
          itemsSucceeded: scenes.length,
          itemsFailed: 0,
        },
      };
    } catch (error) {
      logger.error(`[VideoAgent] Error: ${error}`);
      return { success: false, error: String(error) };
    }
  }

  private async parseScript(script: string): Promise<VideoScene[]> {
    const prompt = `请将以下脚本拆分为视频场景：

${script}

请以JSON数组格式返回，每个场景包含：
[
  {
    "text": "该场景的文案",
    "visual": "画面描述",
    "duration": 预计时长(秒),
    "bgm": "背景音乐建议"
  }
]`;

    return await chatCompletionJSON([
      { role: 'user', content: prompt },
    ]);
  }

  private async matchVisuals(scenes: VideoScene[]): Promise<VideoScene[]> {
    // In production, match each scene's visual description with stock footage or AI-generated images
    const matched = scenes.map(scene => ({
      ...scene,
      visual: scene.visual || this.getDefaultVisual(scene.text),
    }));

    return matched;
  }

  private getDefaultVisual(text: string): string {
    // Default visual suggestions based on text content
    if (text.includes('产品')) return '产品展示画面';
    if (text.includes('人物')) return '人物特写镜头';
    if (text.includes('风景')) return '风景航拍画面';
    if (text.includes('数据')) return '数据可视化图表';
    return '通用素材画面';
  }

  private generateSubtitles(scenes: VideoScene[]): { text: string; start: number; end: number }[] {
    const subtitles: { text: string; start: number; end: number }[] = [];
    let currentTime = 0;

    for (const scene of scenes) {
      const words = scene.text.split(/(?<=[\u4e00-\u9fa5])/);
      const charsPerSecond = 8;

      for (const word of words) {
        if (!word.trim()) continue;
        const duration = word.length / charsPerSecond;
        subtitles.push({
          text: word.trim(),
          start: currentTime,
          end: currentTime + duration,
        });
        currentTime += duration;
      }

      currentTime += 0.5; // Scene transition pause
    }

    return subtitles;
  }

  private selectBGM(style?: string): string {
    const bgmLibrary: Record<string, string[]> = {
      modern: ['bgm-electronic-01.mp3', 'bgm-upbeat-01.mp3', 'bgm-tech-01.mp3'],
      emotional: ['bgm-piano-01.mp3', 'bgm-strings-01.mp3', 'bgm-warm-01.mp3'],
      energetic: ['bgm-rock-01.mp3', 'bgm-pop-01.mp3', 'bgm-dance-01.mp3'],
      professional: ['bgm-corporate-01.mp3', 'bgm-news-01.mp3', 'bgm-doc-01.mp3'],
      default: ['bgm-default-01.mp3', 'bgm-default-02.mp3'],
    };

    const library = bgmLibrary[style || 'default'] || bgmLibrary.default;
    return library[Math.floor(Math.random() * library.length)];
  }

  private async renderVideo(
    scenes: VideoScene[],
    subtitles: { text: string; start: number; end: number }[],
    bgm: string,
    ratio?: string
  ): Promise<string> {
    const outputPath = path.join(process.cwd(), 'uploads', `video_${Date.now()}.mp4`);

    // In production, use FFmpeg to compose the video:
    // 1. Concatenate visual clips
    // 2. Overlay subtitles
    // 3. Add BGM and voiceover
    // 4. Apply transitions and effects

    logger.info('[VideoAgent] Video composition:');
    logger.info(`  Scenes: ${scenes.length}`);
    logger.info(`  Subtitles: ${subtitles.length}`);
    logger.info(`  BGM: ${bgm}`);
    logger.info(`  Ratio: ${ratio || '16:9'}`);

    // Create a placeholder file
    fs.writeFileSync(outputPath, Buffer.from([]));

    return outputPath;
  }

  private storeVideo(title: string, videoPath: string): void {
    const id = `video_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    db.prepare(`
      INSERT INTO contents (id, type, title, body, source_agent_id, tags, status)
      VALUES (?, 'video', ?, ?, 'video', ?, 'draft')
    `).run(id, title, JSON.stringify({ videoPath }), JSON.stringify(['video', 'ai-generated']));
  }
}
