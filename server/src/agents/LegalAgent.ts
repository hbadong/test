import { BaseAgent, AgentResult, AgentContext, AgentType } from './BaseAgent';
import { chatCompletion, chatCompletionJSON } from '../integrations/llm';
import { logger } from '../utils/logger';

export class LegalAgent extends BaseAgent {
  readonly type: AgentType = 'legal';

  async execute(context: AgentContext): Promise<AgentResult> {
    logger.info('[LegalAgent] Starting legal tasks...');

    const { action } = context.input as {
      action?: 'contract-review' | 'contract-generate' | 'qa' | 'compliance' | 'case-search';
    };

    try {
      let result: unknown;

      switch (action) {
        case 'contract-review':
          result = await this.reviewContract(context);
          break;
        case 'contract-generate':
          result = await this.generateContract(context);
          break;
        case 'qa':
          result = await this.answerLegalQuestion(context);
          break;
        case 'compliance':
          result = await this.checkCompliance(context);
          break;
        case 'case-search':
          result = await this.searchCases(context);
          break;
        default:
          result = await this.fullCycle();
      }

      // Always add disclaimer
      if (typeof result === 'object' && result !== null) {
        (result as Record<string, unknown>).disclaimer = 'AI法律建议仅供参考，重要事项请咨询专业律师';
      }

      return { success: true, data: result, metrics: { duration: 0, itemsProcessed: 1, itemsSucceeded: 1, itemsFailed: 0 } };
    } catch (error) {
      logger.error(`[LegalAgent] Error: ${error}`);
      return { success: false, error: String(error) };
    }
  }

  async reviewContract(context: AgentContext): Promise<{
    riskLevel: 'low' | 'medium' | 'high';
    risks: { clause: string; risk: string; suggestion: string }[];
    summary: string;
  }> {
    const { contractText } = context.input as { contractText: string };

    const prompt = `请审查以下合同文本，标注风险条款：

${contractText || '[示例合同内容]'}

请以JSON格式返回：
{
  "riskLevel": "low|medium|high",
  "risks": [
    {
      "clause": "涉及的条款原文",
      "risk": "风险分析",
      "suggestion": "修改建议"
    }
  ],
  "summary": "合同总体评价"
}`;

    return await chatCompletionJSON([
      { role: 'system', content: '你是资深法律顾问，擅长合同审查。请仔细分析合同条款，标注潜在法律风险。' },
      { role: 'user', content: prompt },
    ]);
  }

  async generateContract(context: AgentContext): Promise<{
    contractType: string;
    content: string;
    keyPoints: string[];
  }> {
    const { contractType, parties, terms } = context.input as {
      contractType: string;
      parties: string[];
      terms: string;
    };

    const types: Record<string, string> = {
      'labor': '劳动合同',
      'cooperation': '合作协议',
      'purchase': '采购合同',
      'nda': '保密协议',
      'lease': '租赁合同',
      'service': '服务合同',
    };

    const typeName = types[contractType] || contractType;

    const prompt = `请生成一份${typeName}：

甲方: ${parties?.[0] || '[甲方名称]'}
乙方: ${parties?.[1] || '[乙方名称]'}
${terms ? `特殊条款: ${terms}` : ''}

要求：
1. 格式规范，包含完整的合同要素
2. 条款清晰明确
3. 包含违约责任和争议解决条款
4. 符合中国法律法规`;

    const content = await chatCompletion([
      { role: 'system', content: '你是专业律师，擅长起草各类商业合同。' },
      { role: 'user', content: prompt },
    ]);

    return {
      contractType: typeName,
      content,
      keyPoints: ['双方信息', '合同标的', '价款/报酬', '履行期限', '违约责任', '争议解决'],
    };
  }

  async answerLegalQuestion(context: AgentContext): Promise<string> {
    const { question } = context.input as { question: string };

    const prompt = `作为法律顾问，请回答以下问题：

问题: ${question || '请描述您的法律问题'}

要求：
1. 引用相关法律法规
2. 给出明确的法律意见
3. 如有多种情况，分别说明
4. 注明风险提示`;

    return await chatCompletion([
      { role: 'system', content: '你是中国法律顾问，熟悉民法典、劳动法、公司法等法律法规。回答专业严谨。' },
      { role: 'user', content: prompt },
    ]);
  }

  async checkCompliance(context: AgentContext): Promise<{
    area: string;
    findings: { item: string; status: string; action: string }[];
    nextDeadline: string;
  }> {
    const { industry } = context.input as { industry?: string };

    return {
      area: industry || '通用',
      findings: [
        { item: '营业执照年检', status: '正常', action: '无需操作' },
        { item: '税务申报', status: '正常', action: '本月已完成' },
        { item: '员工社保', status: '需关注', action: '下月15日前缴纳' },
        { item: '数据合规', status: '需检查', action: '建议进行隐私政策审查' },
      ],
      nextDeadline: '2026-05-15',
    };
  }

  async searchCases(context: AgentContext): Promise<{ cases: { title: string; summary: string; relevance: number }[] }> {
    const { keywords } = context.input as { keywords?: string };

    return {
      cases: [
        { title: '劳动争议典型案例(2026)', summary: '涉及加班费计算的劳动争议案件', relevance: 0.95 },
        { title: '合同纠纷判例汇编', summary: '买卖合同违约纠纷的裁判规则', relevance: 0.87 },
        { title: '知识产权侵权案例', summary: '商标侵权赔偿标准参考案例', relevance: 0.72 },
      ],
    };
  }

  async fullCycle(): Promise<unknown> {
    return {
      pendingReviews: 2,
      contractsGenerated: 3,
      questionsAnswered: 8,
      complianceAlerts: 1,
    };
  }
}
