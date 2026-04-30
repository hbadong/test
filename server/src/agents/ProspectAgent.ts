import { BaseAgent, AgentResult, AgentContext, AgentType } from './BaseAgent';
import { chatCompletion } from '../integrations/llm';
import { db } from '../config/database';
import { logger } from '../utils/logger';

interface LeadData {
  name: string;
  company: string;
  title: string;
  industry: string;
  email: string;
  phone: string;
  source: string;
}

export class ProspectAgent extends BaseAgent {
  readonly type: AgentType = 'prospect';

  async execute(context: AgentContext): Promise<AgentResult> {
    logger.info('[ProspectAgent] Starting customer prospecting...');

    const { industry, region, companySize, targetRole } = context.input as {
      industry?: string;
      region?: string;
      companySize?: string;
      targetRole?: string;
    };

    try {
      // Step 1: Find potential leads from multiple channels
      const leads = await this.findLeads({ industry, region, companySize, targetRole });

      // Step 2: Generate personalized outreach messages
      const enrichedLeads = await this.enrichLeads(leads);

      // Step 3: Store leads in database
      this.storeLeads(enrichedLeads);

      // Step 4: Generate outreach plan
      const outreachPlan = await this.generateOutreachPlan(enrichedLeads);

      return {
        success: true,
        data: {
          totalFound: leads.length,
          enriched: enrichedLeads.length,
          leads: enrichedLeads.slice(0, 20),
          outreachPlan,
        },
        metrics: {
          duration: 0,
          itemsProcessed: leads.length,
          itemsSucceeded: enrichedLeads.length,
          itemsFailed: leads.length - enrichedLeads.length,
        },
      };
    } catch (error) {
      logger.error(`[ProspectAgent] Error: ${error}`);
      return { success: false, error: String(error) };
    }
  }

  private async findLeads(filters: {
    industry?: string;
    region?: string;
    companySize?: string;
    targetRole?: string;
  }): Promise<LeadData[]> {
    logger.info('[ProspectAgent] Searching for leads...');

    // Simulated lead data - in production, integrate with real data sources
    const industries = filters.industry ? [filters.industry] : ['科技', '教育', '电商', '金融', '医疗'];
    const regions = filters.region ? [filters.region] : ['北京', '上海', '深圳', '杭州', '广州'];

    const leads: LeadData[] = [];

    for (const ind of industries) {
      for (const reg of regions) {
        const count = Math.floor(Math.random() * 5) + 1;
        for (let i = 0; i < count; i++) {
          leads.push({
            name: this.randomName(),
            company: `${reg}${this.randomCompanyName()}公司`,
            title: filters.targetRole || this.randomTitle(),
            industry: ind,
            email: `${this.randomEmail()}`,
            phone: this.randomPhone(),
            source: 'enterprise-db',
          });
        }
      }
    }

    return leads;
  }

  private async enrichLeads(leads: LeadData[]): Promise<(LeadData & { outreachMessage: string; intentScore: number })[]> {
    const enriched: (LeadData & { outreachMessage: string; intentScore: number })[] = [];

    for (const lead of leads.slice(0, 20)) {
      // Generate personalized message
      const message = await this.generateOutreachMessage(lead);
      const intentScore = Math.floor(Math.random() * 100);

      enriched.push({ ...lead, outreachMessage: message, intentScore });
    }

    return enriched;
  }

  private async generateOutreachMessage(lead: LeadData): Promise<string> {
    const prompt = `请为以下潜在客户生成个性化的开发邮件/消息：

客户信息：
- 姓名: ${lead.name}
- 公司: ${lead.company}
- 职位: ${lead.title}
- 行业: ${lead.industry}

要求：
1. 称呼礼貌专业
2. 简明扼要说明来意
3. 体现对客户公司的了解
4. 提供价值主张
5. 包含明确的行动号召
6. 语气真诚不推销感
7. 中文，150字以内`;

    return await chatCompletion([
      { role: 'system', content: '你是专业的商务拓展专家，擅长撰写高回复率的开发信。' },
      { role: 'user', content: prompt },
    ]);
  }

  private async generateOutreachPlan(leads: (LeadData & { outreachMessage: string })[]): Promise<string> {
    const prompt = `基于以下${leads.length}个潜在客户，制定一个7天的触达计划：

要求：
1. 每天触达的批次和时间安排
2. 触达渠道分配（邮件/电话/社交）
3. 跟进策略
4. 预期转化率`;

    return await chatCompletion([
      { role: 'system', content: '你是销售策略专家' },
      { role: 'user', content: prompt },
    ]);
  }

  private storeLeads(leads: (LeadData & { outreachMessage: string; intentScore: number })[]): void {
    const stmt = db.prepare(`
      INSERT INTO leads (id, source, name, company, phone, email, tags, intent_level, status, notes)
      VALUES (?, 'prospect', ?, ?, ?, ?, ?, ?, 'new', ?)
    `);

    for (const lead of leads) {
      const intentLevel = lead.intentScore > 70 ? 'high' : lead.intentScore > 40 ? 'medium' : 'low';
      stmt.run(
        `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        lead.name,
        lead.company,
        lead.phone,
        lead.email,
        JSON.stringify([lead.industry, lead.title]),
        intentLevel,
        lead.outreachMessage
      );
    }
  }

  private randomName(): string {
    const surnames = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴'];
    const names = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟'];
    return surnames[Math.floor(Math.random() * surnames.length)] + names[Math.floor(Math.random() * names.length)];
  }

  private randomCompanyName(): string {
    const prefixes = ['创新', '科技', '智能', '数据', '网络', '数字', '云', '互联', '未来', '新视界'];
    const suffixes = ['信息', '技术', '网络', '软件', '电子', '通信', '传媒', '文化', '教育', '咨询'];
    return prefixes[Math.floor(Math.random() * prefixes.length)] + suffixes[Math.floor(Math.random() * suffixes.length)];
  }

  private randomTitle(): string {
    const titles = ['CEO', 'CTO', '市场总监', '运营总监', '采购经理', '产品总监', '销售总监', '总经理'];
    return titles[Math.floor(Math.random() * titles.length)];
  }

  private randomEmail(): string {
    const domains = ['gmail.com', 'qq.com', '163.com', 'company.com', 'outlook.com'];
    return `contact${Math.floor(Math.random() * 9999)}@${domains[Math.floor(Math.random() * domains.length)]}`;
  }

  private randomPhone(): string {
    return `1${3 + Math.floor(Math.random() * 7)}${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`;
  }
}
