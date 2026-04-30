import { BaseAgent, AgentResult, AgentContext, AgentType } from './BaseAgent';
import { chatCompletion, chatCompletionJSON } from '../integrations/llm';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import axios from 'axios';

interface TrendItem {
  platform: string;
  title: string;
  keywords: string[];
  heat: number;
  url: string;
  category: string;
}

export class TrendAgent extends BaseAgent {
  readonly type: AgentType = 'trend';

  async execute(context: AgentContext): Promise<AgentResult> {
    logger.info('[TrendAgent] Starting trend tracking...');

    try {
      // Step 1: Fetch trending topics from multiple platforms
      const trends = await this.fetchTrends();

      // Step 2: Filter by user's industry/categories
      const filteredTrends = this.filterByIndustry(trends, context);

      // Step 3: Generate content suggestions using LLM
      const suggestions = await this.generateSuggestions(filteredTrends, context);

      // Step 4: Store results
      const storedItems = this.storeTrends(filteredTrends);

      return {
        success: true,
        data: {
          totalTrends: trends.length,
          filteredTrends: filteredTrends.length,
          suggestions,
          topTrends: filteredTrends.slice(0, 10),
        },
        metrics: {
          duration: 0,
          itemsProcessed: trends.length,
          itemsSucceeded: filteredTrends.length,
          itemsFailed: trends.length - filteredTrends.length,
        },
      };
    } catch (error) {
      logger.error(`[TrendAgent] Error: ${error}`);
      return { success: false, error: String(error) };
    }
  }

  private async fetchTrends(): Promise<TrendItem[]> {
    const allTrends: TrendItem[] = [];

    // Fetch from simulated platforms (in production, integrate real APIs)
    const platforms = [
      { name: 'douyin', url: '', topics: this.generateTrendSuggestions('douyin') },
      { name: 'weibo', url: '', topics: this.generateTrendSuggestions('weibo') },
      { name: 'xiaohongshu', url: '', topics: this.generateTrendSuggestions('xiaohongshu') },
    ];

    for (const platform of platforms) {
      for (const topic of platform.topics) {
        allTrends.push({
          platform: platform.name,
          title: topic,
          keywords: this.extractKeywords(topic),
          heat: Math.floor(Math.random() * 1000000) + 10000,
          url: `https://${platform.name}.com/trending/${encodeURIComponent(topic)}`,
          category: 'trending',
        });
      }
    }

    allTrends.sort((a, b) => b.heat - a.heat);
    return allTrends;
  }

  private generateTrendSuggestions(platform: string): string[] {
    const trendsByPlatform: Record<string, string[]> = {
      douyin: [
        '2026年最火的AI工具盘点',
        '一个人如何月入过万',
        '实体店转型线上攻略',
        '自媒体新手起号指南',
        '电商直播带货技巧',
        '小户型装修灵感',
        '健康饮食一日三餐',
        '职场新人避坑指南',
      ],
      weibo: [
        'AI改变生活方式',
        '数字经济新机遇',
        '年轻人创业故事',
        '绿色环保生活',
        '科技产品评测',
        '文化旅游推荐',
      ],
      xiaohongshu: [
        '沉浸式护肤 routine',
        '平价好物分享',
        '一人食菜谱合集',
        '职场穿搭公式',
        '居家办公效率神器',
        '周末去哪儿玩',
        '自媒体运营干货',
      ],
    };

    return trendsByPlatform[platform] || [];
  }

  private extractKeywords(text: string): string[] {
    return text
      .split(/(?<=[\u4e00-\u9fa5])/)
      .filter(w => w.length >= 2)
      .slice(0, 5);
  }

  private filterByIndustry(trends: TrendItem[], context: AgentContext): TrendItem[] {
    const industries = (this.getConfig().parameters.industries as string[]) || [];
    if (!industries.length) return trends;

    return trends.filter(t =>
      industries.some(ind =>
        t.title.includes(ind) || t.keywords.some(k => k.includes(ind))
      )
    );
  }

  private async generateSuggestions(trends: TrendItem[], context: AgentContext): Promise<unknown[]> {
    const topTrends = trends.slice(0, 5);
    if (!topTrends.length) return [];

    try {
      const prompt = `基于以下热点话题，为自媒体运营者生成5个内容选题建议：
${topTrends.map(t => `- [${t.platform}] ${t.title} (热度: ${t.heat})`).join('\n')}

请以JSON数组格式返回，每个选题包含：title, platform, angle, estimatedReach, contentFormat`;

      const suggestions = await chatCompletionJSON<unknown[]>([
        { role: 'user', content: prompt },
      ], { maxTokens: 2000 });

      return suggestions;
    } catch (error) {
      logger.error(`[TrendAgent] Failed to generate suggestions: ${error}`);
      return topTrends.map(t => ({
        title: `追爆: ${t.title}`,
        platform: t.platform,
        angle: '热点跟进',
        estimatedReach: '预估1万+曝光',
        contentFormat: '短视频',
      }));
    }
  }

  private storeTrends(trends: TrendItem[]): number {
    const stmt = db.prepare(`
      INSERT INTO contents (id, type, title, body, source_agent_id, source_url, tags, status)
      VALUES (?, 'text', ?, ?, 'trend', ?, ?, 'draft')
    `);

    for (const trend of trends.slice(0, 20)) {
      stmt.run(
        `trend_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        `[${trend.platform}] ${trend.title}`,
        JSON.stringify({ keywords: trend.keywords, heat: trend.heat }),
        trend.url,
        JSON.stringify([trend.platform, 'trending', trend.category])
      );
    }

    return Math.min(trends.length, 20);
  }
}
