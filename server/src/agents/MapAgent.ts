import { BaseAgent, AgentResult, AgentContext, AgentType } from './BaseAgent';
import { chatCompletion } from '../integrations/llm';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import axios from 'axios';

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
      // Step 1: Query POI data from map API
      const pois = await this.queryPOIs(centerLat, centerLng, radius || 5000, categories);

      // Step 2: Filter by rating and other criteria
      const filtered = pois.filter(p => !minRating || p.rating >= minRating);

      // Step 3: Generate outreach plan for each POI
      const enriched = await this.enrichPOIs(filtered);

      // Step 4: Store as leads
      this.storePOILeads(enriched);

      // Step 5: Export data
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
          itemsFailed: pois.length - enriched.length,
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

    const provider = this.getSetting('map.provider') || 'amap';

    // In production, call actual map API:
    // AMap: https://restapi.amap.com/v3/place/around
    // Baidu: https://api.map.baidu.com/place/v2/search

    // Simulated POI data
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
  }

  private storePOILeads(pois: (POIData & { outreachPlan: string })[]): void {
    const stmt = db.prepare(`
      INSERT INTO leads (id, source, name, company, phone, email, tags, intent_level, status, notes)
      VALUES (?, 'map-prospect', ?, ?, ?, '', ?, 'unknown', 'new', ?)
    `);

    for (const poi of pois) {
      stmt.run(
        `map_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        poi.name,
        poi.name,
        poi.phone,
        JSON.stringify([poi.category, `rating-${poi.rating.toFixed(1)}`, 'map-lead']),
        JSON.stringify({ address: poi.address, lat: poi.latitude, lng: poi.longitude, plan: poi.outreachPlan })
      );
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
