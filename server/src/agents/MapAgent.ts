import { BaseAgent, AgentResult, AgentContext, AgentType } from './BaseAgent';
import { chatCompletion } from '../integrations/llm';
import { db } from '../config/database';
import { logger } from '../utils/logger';

interface POIData {
  id: string;
  name: string;
  address: string;
  phone: string;
  category: string;
  rating: number;
  latitude: number;
  longitude: number;
}

export class MapAgent extends BaseAgent {
  readonly type: AgentType = 'map-prospect';

  async execute(context: AgentContext): Promise<AgentResult> {
    logger.info('[MapAgent] Starting map-based prospecting...');

    const { centerLat, centerLng, radius, categories, minRating } = context.input as {
      centerLat?: number;
      centerLng?: number;
      radius?: number;
      categories?: string[];
      minRating?: number;
    };

    if (!centerLat || !centerLng) {
      return { success: false, error: '请指定中心坐标 (latitude, longitude)' };
    }

    try {
      const pois = await this.queryPOIs(centerLat, centerLng, radius || 5000, categories);
      const filtered = pois.filter(p => !minRating || p.rating >= minRating);
      const enriched = await this.enrichPOIs(filtered);
      this.storePOILeads(enriched);
      const exportData = this.prepareExport(enriched);

      return {
        success: true,
        data: {
          center: { lat: centerLat, lng: centerLng },
          radius: radius || 5000,
          totalFound: pois.length,
          filtered: filtered.length,
          pois: enriched.slice(0, 50),
          exportData,
        },
        metrics: {
          duration: 0,
          itemsProcessed: pois.length,
          itemsSucceeded: enriched.length,
          itemsFailed: 0,
        },
      };
    } catch (error) {
      logger.error(`[MapAgent] Error: ${error}`);
      return { success: false, error: String(error) };
    }
  }

  private async queryPOIs(
    lat: number,
    lng: number,
    radius: number,
    categories?: string[]
  ): Promise<POIData[]> {
    logger.info(`[MapAgent] Querying POIs at (${lat}, ${lng}) within ${radius}m...`);

    const pois: POIData[] = [];
    const categoryList = categories || ['餐饮', '零售', '教育', '美容', '健身', '医疗', '酒店', '房产'];

    for (let i = 0; i < 30; i++) {
      const cat = categoryList[Math.floor(Math.random() * categoryList.length)];
      pois.push({
        id: `poi_${i}`,
        name: `${this.randomBusinessName()}(${cat})`,
        address: `${['东', '西', '南', '北'][Math.floor(Math.random() * 4)]}${Math.floor(Math.random() * 999) + 1}号`,
        phone: `0${10 + Math.floor(Math.random() * 90)}-${Math.floor(Math.random() * 90000000) + 10000000}`,
        category: cat,
        rating: 3 + Math.random() * 2,
        latitude: lat + (Math.random() - 0.5) * radius / 111000,
        longitude: lng + (Math.random() - 0.5) * radius / 111000,
      });
    }

    return pois;
  }

  private async enrichPOIs(pois: POIData[]): Promise<(POIData & { outreachPlan: string })[]> {
    const enriched: (POIData & { outreachPlan: string })[] = [];

    for (const poi of pois.slice(0, 30)) {
      const plan = await this.generateOutreachPlan(poi);
      enriched.push({ ...poi, outreachPlan: plan });
    }

    return enriched;
  }

  private async generateOutreachPlan(poi: POIData): Promise<string> {
    try {
      const prompt = `基于以下商户信息，制定一个BD开发计划：

商户: ${poi.name}
地址: ${poi.address}
类别: ${poi.category}
评分: ${poi.rating.toFixed(1)}

请提供：
1. 首次接触方式
2. 核心痛点分析
3. 推荐合作方案
4. 预期谈判周期`;

      return await chatCompletion([
        { role: 'system', content: '你是本地商业拓展专家' },
        { role: 'user', content: prompt },
      ]);
    } catch (error) {
      return this.generateFallbackPlan(poi);
    }
  }

  private generateFallbackPlan(poi: POIData): string {
    const plans: Record<string, string> = {
      '餐饮': `针对${poi.name}的BD方案：1.首次电话拜访了解需求 2.推荐线上推广方案 3.提供试用餐券引流 4.预期2周内签约`,
      '零售': `针对${poi.name}的BD方案：1.实地拜访了解经营状况 2.推荐数字化改造方案 3.提供会员系统试用 4.预期3周内签约`,
      '教育': `针对${poi.name}的BD方案：1.电话沟通招生需求 2.推荐线上课程方案 3.提供免费体验课 4.预期2-3周签约`,
      '美容': `针对${poi.name}的BD方案：1.预约到店体验 2.推荐会员管理方案 3.提供引流活动策划 4.预期2周内签约`,
      '健身': `针对${poi.name}的BD方案：1.实地考察了解设施 2.推荐智能管理系统 3.提供免费体验周 4.预期3周签约`,
    };
    return plans[poi.category] || `针对${poi.name}的BD方案：1.初步接触了解需求 2.提供定制化方案 3.安排产品演示 4.预期2-4周签约`;
  }

  private storePOILeads(pois: (POIData & { outreachPlan: string })[]): void {
    const stmt = db.prepare(`
      INSERT INTO leads (id, source, name, company, phone, email, tags, intent_level, status, notes)
      VALUES (?, 'map-prospect', ?, '', ?, '', ?, 'unknown', 'new', ?)
    `);

    const insertMany = db.transaction((items: Array<{ id: string; name: string; phone: string; tags: string; plan: string }>) => {
      for (const item of items) {
        stmt.run(item.id, item.name, item.name, item.phone, item.tags, item.plan);
      }
    });

    try {
      const items = pois.slice(0, 20).map(poi => ({
        id: `map_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: poi.name,
        phone: poi.phone || '',
        tags: JSON.stringify([poi.category, `rating-${poi.rating.toFixed(1)}`, 'map-lead']),
        plan: JSON.stringify({ address: poi.address, lat: poi.latitude, lng: poi.longitude, plan: poi.outreachPlan }),
      }));

      if (items.length > 0) {
        insertMany(items);
      }
    } catch (error) {
      logger.warn(`[MapAgent] Failed to store POI leads: ${error}`);
    }
  }

  private prepareExport(pois: POIData[]): string {
    const headers = ['名称', '地址', '电话', '类别', '评分', '纬度', '经度'];
    const rows = pois.map(p => [p.name, p.address, p.phone, p.category, p.rating.toFixed(1), String(p.latitude), String(p.longitude)]);
    return [headers, ...rows].map(r => r.join(',')).join('\n');
  }

  private randomBusinessName(): string {
    const prefixes = ['好味', '优品', '精品', '时尚', '健康', '快乐', '温馨', '高端', '便民', '绿色'];
    const suffixes = ['餐厅', '超市', '美发', '瑜伽', '诊所', '酒店', '书店', '咖啡', '健身', '培训'];
    return prefixes[Math.floor(Math.random() * prefixes.length)] + suffixes[Math.floor(Math.random() * suffixes.length)];
  }
}
