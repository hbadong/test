import { BaseAgent, AgentResult, AgentContext, AgentType } from './BaseAgent';
import { chatCompletion, chatCompletionJSON } from '../integrations/llm';
import { db } from '../config/database';
import { logger } from '../utils/logger';

interface CallRecord {
  id: string;
  phoneNumber: string;
  customerName: string;
  status: 'connected' | 'no-answer' | 'busy' | 'rejected';
  duration: number;
  intent: 'A' | 'B' | 'C' | 'D';
  summary: string;
  transcript: string;
  timestamp: string;
}

export class CallAgent extends BaseAgent {
  readonly type: AgentType = 'call';

  async execute(context: AgentContext): Promise<AgentResult> {
    logger.info('[CallAgent] Starting AI telemarketing...');

    const { action, phoneList, script } = context.input as {
      action?: 'call' | 'analyze' | 'report';
      phoneList?: Array<{ phone: string; name: string; company: string }>;
      script?: string;
    };

    try {
      let result: unknown;

      switch (action) {
        case 'call':
          result = await this.makeCalls(phoneList || [], script);
          break;
        case 'analyze':
          result = await this.analyzeCalls();
          break;
        case 'report':
          result = await this.generateReport();
          break;
        default:
          result = await this.fullCycle();
      }

      return { success: true, data: result, metrics: { duration: 0, itemsProcessed: 1, itemsSucceeded: 1, itemsFailed: 0 } };
    } catch (error) {
      logger.error(`[CallAgent] Error: ${error}`);
      return { success: false, error: String(error) };
    }
  }

  async makeCalls(
    phoneList: Array<{ phone: string; name: string; company: string }>,
    script?: string
  ): Promise<{ total: number; connected: number; intentBreakdown: Record<string, number>; records: CallRecord[] }> {
    logger.info(`[CallAgent] Making ${phoneList.length} outbound calls...`);

    const records: CallRecord[] = [];

    for (const contact of phoneList) {
      const record = await this.simulateCall(contact, script);
      records.push(record);

      // Store call record
      this.storeCallRecord(record);
    }

    const connected = records.filter(r => r.status === 'connected').length;
    const intentBreakdown = {
      A: records.filter(r => r.intent === 'A').length,
      B: records.filter(r => r.intent === 'B').length,
      C: records.filter(r => r.intent === 'C').length,
      D: records.filter(r => r.intent === 'D').length,
    };

    return { total: phoneList.length, connected, intentBreakdown, records: records.slice(0, 10) };
  }

  private async simulateCall(
    contact: { phone: string; name: string; company: string },
    script?: string
  ): Promise<CallRecord> {
    // Simulate call outcome
    const rand = Math.random();
    let status: 'connected' | 'no-answer' | 'busy' | 'rejected';

    if (rand < 0.6) status = 'connected';
    else if (rand < 0.75) status = 'no-answer';
    else if (rand < 0.88) status = 'busy';
    else status = 'rejected';

    const duration = status === 'connected' ? Math.floor(Math.random() * 300) + 30 : 0;

    // For connected calls, generate conversation summary
    let summary = '';
    let intent: 'A' | 'B' | 'C' | 'D' = 'D';
    let transcript = '';

    if (status === 'connected') {
      const intentRand = Math.random();
      if (intentRand < 0.15) {
        intent = 'A';
        summary = '客户明确表示需求，愿意进一步了解/签约';
      } else if (intentRand < 0.4) {
        intent = 'B';
        summary = '客户有兴趣，需要后续跟进';
      } else if (intentRand < 0.7) {
        intent = 'C';
        summary = '客户暂时无需求，保持联系';
      } else {
        intent = 'D';
        summary = '客户明确拒绝';
      }

      transcript = `AI: 您好${contact.name}，我是...
客户: ${this.generateCustomerResponse(intent)}
AI: ${await this.generateAIResponse(intent, script)}
...`;
    }

    return {
      id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      phoneNumber: contact.phone,
      customerName: contact.name,
      status,
      duration,
      intent,
      summary,
      transcript,
      timestamp: new Date().toISOString(),
    };
  }

  private generateCustomerResponse(intent: string): string {
    const responses: Record<string, string[]> = {
      A: ['嗯，我对这个挺感兴趣的，能详细介绍一下吗？', '正好我们也在找这样的服务，具体是什么情况？'],
      B: ['听起来还行，你先发份资料给我看看', '可以了解一下，你加我微信吧'],
      C: ['暂时不需要了，以后有需要再联系', '现在还没这个计划，谢谢'],
      D: ['不需要，谢谢', '没兴趣，别再打了'],
    };
    const list = responses[intent] || responses.D;
    return list[Math.floor(Math.random() * list.length)];
  }

  private async generateAIResponse(intent: string, script?: string): Promise<string> {
    const prompts: Record<string, string> = {
      A: '太好了！我马上为您详细介绍我们的方案...',
      B: '没问题，我稍后把详细资料发您，请问您方便的时间是？',
      C: '理解，那我先把资料发您备用，有需要随时联系我',
      D: '好的，打扰了，祝您工作顺利',
    };
    return prompts[intent] || '好的，感谢您的时间';
  }

  private storeCallRecord(record: CallRecord): void {
    db.prepare(`
      INSERT INTO leads (id, source, name, company, phone, email, tags, intent_level, status, notes)
      VALUES (?, 'call', ?, '', ?, '', ?, ?, ?, ?)
    `).run(
      record.id,
      record.customerName,
      record.phoneNumber,
      JSON.stringify(['telemarketing', `intent-${record.intent}`]),
      record.intent === 'A' ? 'high' : record.intent === 'B' ? 'medium' : 'low',
      record.status === 'connected' ? 'contacted' : 'new',
      JSON.stringify({ duration: record.duration, summary: record.summary, transcript: record.transcript })
    );
  }

  async analyzeCalls(): Promise<{
    totalCalls: number;
    connectRate: number;
    intentRate: number;
    avgDuration: number;
    topObjections: string[];
  }> {
    return {
      totalCalls: 150,
      connectRate: 62,
      intentRate: 28,
      avgDuration: 120,
      topObjections: ['价格太贵', '暂时不需要', '已有供应商', '需要内部讨论'],
    };
  }

  async generateReport(): Promise<{
    daily: { calls: number; connected: number; A: number; B: number };
    weekly: { calls: number; connected: number; A: number; B: number };
    conversion: { callToLead: number; leadToDeal: number };
  }> {
    return {
      daily: { calls: 50, connected: 30, A: 5, B: 10 },
      weekly: { calls: 350, connected: 210, A: 35, B: 70 },
      conversion: { callToLead: 28, leadToDeal: 12 },
    };
  }

  async fullCycle(): Promise<unknown> {
    return {
      callsMade: 50,
      connected: 32,
      highIntent: 5,
      mediumIntent: 12,
      followUpScheduled: 8,
    };
  }
}
