import { BaseAgent, AgentResult, AgentContext, AgentType } from './BaseAgent';
import { chatCompletion, chatCompletionJSON } from '../integrations/llm';
import { db } from '../config/database';
import { logger } from '../utils/logger';

export type ContentType = 'copywriting' | 'image-prompt' | 'script' | 'seo' | 'social-post';

export class CreateAgent extends BaseAgent {
  readonly type: AgentType = 'create';

  async execute(context: AgentContext): Promise<AgentResult> {
    logger.info('[CreateAgent] Starting content creation...');

    const { topic, contentType, platform, style, tone } = context.input as {
      topic?: string;
      contentType?: ContentType;
      platform?: string;
      style?: string;
      tone?: string;
    };

    if (!topic) {
      return { success: false, error: '创作主题不能为空' };
    }

    try {
      const results: Record<string, unknown> = {};

      // Generate copywriting
      if (!contentType || contentType === 'copywriting') {
        results.copywriting = await this.generateCopywriting(topic, platform, style, tone);
      }

      // Generate image prompt
      if (!contentType || contentType === 'image-prompt') {
        results.imagePrompt = await this.generateImagePrompt(topic, style);
      }

      // Generate video script
      if (!contentType || contentType === 'script') {
        results.script = await this.generateScript(topic, platform);
      }

      // Generate SEO description
      if (!contentType || contentType === 'seo') {
        results.seo = await this.generateSEO(topic);
      }

      // Store content
      const contentId = this.storeContent(topic, results);

      return {
        success: true,
        data: { contentId, ...results },
        metrics: {
          duration: 0,
          itemsProcessed: 1,
          itemsSucceeded: 1,
          itemsFailed: 0,
        },
      };
    } catch (error) {
      logger.error(`[CreateAgent] Error: ${error}`);
      return { success: false, error: String(error) };
    }
  }

  async generateCopywriting(
    topic: string,
    platform?: string,
    style?: string,
    tone?: string
  ): Promise<string> {
    const platformPrompt = this.getPlatformPrompt(platform);
    const stylePrompt = style ? `风格: ${style}` : '';
    const tonePrompt = tone ? `语气: ${tone}` : '';

    const prompt = `请为以下主题创作${platformPrompt}：

主题: ${topic}
${stylePrompt}
${tonePrompt}

要求：
1. 标题吸引人，有点击欲
2. 正文结构清晰，段落简短
3. 包含行动号召(CTA)
4. 适当使用emoji增加亲和力
5. 字数控制在300-800字`;

    return await chatCompletion([
      { role: 'system', content: '你是一位资深内容创作者，擅长各平台爆款文案创作。' },
      { role: 'user', content: prompt },
    ]);
  }

  async generateImagePrompt(topic: string, style?: string): Promise<string> {
    const stylePrompt = style ? `风格: ${style}` : '风格: 现代简约';

    const prompt = `请为以下主题生成详细的AI绘画提示词（用于Midjourney/DALL-E）：

主题: ${topic}
${stylePrompt}

请以JSON格式返回：
{
  "mainPrompt": "英文主提示词",
  "negativePrompt": "负面提示词",
  "aspectRatio": "16:9 或 9:16",
  "style": "风格描述"
}`;

    const result = await chatCompletionJSON<{ mainPrompt: string; negativePrompt: string; aspectRatio: string; style: string }>([
      { role: 'user', content: prompt },
    ]);

    return result.mainPrompt;
  }

  async generateScript(topic: string, platform?: string): Promise<string> {
    const platformPrompt = platform || '抖音短视频';

    const prompt = `请为${platformPrompt}创作视频脚本：

主题: ${topic}

格式要求：
1. 开场3秒钩子（抓住注意力）
2. 正文分3-5个段落
3. 每段包含画面描述和配音文案
4. 结尾有行动号召
5. 总时长控制在60-90秒

请以JSON格式返回：
{
  "title": "视频标题",
  "hook": "开场钩子",
  "sections": [{"visual": "画面描述", "voiceover": "配音文案", "duration": 秒数}],
  "cta": "行动号召",
  "tags": ["标签1", "标签2"]
}`;

    const result = await chatCompletionJSON([
      { role: 'user', content: prompt },
    ]);

    return JSON.stringify(result, null, 2);
  }

  async generateSEO(topic: string): Promise<Record<string, string>> {
    const prompt = `请为主题 "${topic}" 生成SEO优化内容：

请返回JSON格式：
{
  "title": "SEO标题(60字符内)",
  "metaDescription": "Meta描述(160字符内)",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "slug": "url-friendly-slug"
}`;

    return await chatCompletionJSON([
      { role: 'user', content: prompt },
    ]);
  }

  async generateSocialPost(topic: string, platform: string): Promise<string> {
    const prompts: Record<string, string> = {
      douyin: `为主题 "${topic}" 创作抖音短视频文案，包含标题(20字内)和描述(100字内)，带5个热门话题标签`,
      xiaohongshu: `为主题 "${topic}" 创作小红书种草笔记，标题吸引眼球，正文包含使用体验和推荐理由，带emoji和话题标签`,
      wechat: `为主题 "${topic}" 创作微信公众号推文大纲，包含标题、引言、3-5个章节标题和结尾`,
      weibo: `为主题 "${topic}" 创作微博文案，140字以内，有话题标签，语言生动有趣`,
    };

    return await chatCompletion([
      { role: 'system', content: '你是社交媒体内容专家' },
      { role: 'user', content: prompts[platform] || prompts.douyin },
    ]);
  }

  private getPlatformPrompt(platform?: string): string {
    const prompts: Record<string, string> = {
      douyin: '抖音短视频文案',
      xiaohongshu: '小红书种草笔记',
      wechat: '微信公众号文章',
      weibo: '微博文案',
      bilibili: 'B站视频文案',
    };
    return platform ? (prompts[platform] || '内容') : '内容';
  }

  private storeContent(topic: string, results: Record<string, unknown>): string {
    const id = `content_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    db.prepare(`
      INSERT INTO contents (id, type, title, body, source_agent_id, tags, status)
      VALUES (?, 'text', ?, ?, 'create', ?, 'draft')
    `).run(
      id,
      topic,
      JSON.stringify(results),
      JSON.stringify(['ai-generated', 'draft'])
    );

    return id;
  }
}
