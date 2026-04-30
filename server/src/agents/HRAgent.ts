import { BaseAgent, AgentResult, AgentContext, AgentType } from './BaseAgent';
import { chatCompletion, chatCompletionJSON } from '../integrations/llm';
import { db } from '../config/database';
import { logger } from '../utils/logger';

export class HRAgent extends BaseAgent {
  readonly type: AgentType = 'hr';

  async execute(context: AgentContext): Promise<AgentResult> {
    logger.info('[HRAgent] Starting HR tasks...');

    const { action } = context.input as {
      action?: 'resume-screening' | 'attendance' | 'qa' | 'report' | 'interview';
    };

    try {
      let result: unknown;

      switch (action) {
        case 'resume-screening':
          result = await this.screenResumes(context);
          break;
        case 'attendance':
          result = await this.processAttendance();
          break;
        case 'qa':
          result = await this.answerHRQuestion(context);
          break;
        case 'report':
          result = await this.generateHRReport();
          break;
        case 'interview':
          result = await this.conductInterview(context);
          break;
        default:
          result = await this.fullCycle();
      }

      return { success: true, data: result, metrics: { duration: 0, itemsProcessed: 1, itemsSucceeded: 1, itemsFailed: 0 } };
    } catch (error) {
      logger.error(`[HRAgent] Error: ${error}`);
      return { success: false, error: String(error) };
    }
  }

  async screenResumes(context: AgentContext): Promise<unknown> {
    const { resume, jobDescription } = context.input as { resume?: string; jobDescription?: string };

    if (!resume) {
      // Simulate batch screening
      const resumes = [
        { name: '张三', position: '前端开发', experience: '5年', score: 85 },
        { name: '李四', position: '产品经理', experience: '3年', score: 72 },
        { name: '王五', position: '设计师', experience: '2年', score: 68 },
        { name: '赵六', position: '前端开发', experience: '8年', score: 92 },
      ];

      const filtered = await Promise.all(resumes.map(async (r) => {
        const match = Math.random() > 0.3 ? 'recommended' : 'not-recommended';
        return { ...r, match, reason: match === 'recommended' ? '经验匹配' : '经验不足' };
      }));

      return { total: resumes.length, screened: filtered.length, recommended: filtered.filter(r => r.match === 'recommended') };
    }

    // Single resume analysis
    const prompt = `请评估以下简历与岗位的匹配度：

岗位描述: ${jobDescription || '前端开发工程师'}

简历内容:
${resume}

请以JSON格式返回评估结果：
{
  "matchScore": 匹配分数(0-100),
  "strengths": ["优势1", "优势2"],
  "weaknesses": ["不足1"],
  "recommendation": "推荐|待考虑|不推荐",
  "interviewQuestions": ["面试问题1", "面试问题2"]
}`;

    return await chatCompletionJSON([
      { role: 'system', content: '你是专业的HR招聘专家' },
      { role: 'user', content: prompt },
    ]);
  }

  async processAttendance(): Promise<{
    total: number;
    normal: number;
    late: number;
    absent: number;
    overtime: number;
  }> {
    const total = 50;
    const normal = total - Math.floor(Math.random() * 8) - 2;
    const late = Math.floor(Math.random() * 3) + 1;
    const absent = Math.floor(Math.random() * 2);
    const overtime = Math.floor(Math.random() * 10) + 5;

    return { total, normal, late, absent, overtime };
  }

  async answerHRQuestion(context: AgentContext): Promise<string> {
    const { question } = context.input as { question: string };

    if (!question) {
      return '请输入您的人事相关问题，如：请假流程、报销政策、年假天数等。';
    }

    const prompt = `作为HR助手，请回答以下员工问题：

问题: ${question}

要求：
1. 回答准确、清晰
2. 引用相关制度条款
3. 如需流程，列出具体步骤
4. 语气友好专业`;

    return await chatCompletion([
      { role: 'system', content: '你是企业HR助手，熟悉劳动法和公司内部人事制度。' },
      { role: 'user', content: prompt },
    ]);
  }

  async generateHRReport(): Promise<{
    period: string;
    headcount: number;
    turnover: number;
    hiring: number;
    attendance: { rate: number };
    training: { sessions: number; participants: number };
  }> {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    return {
      period,
      headcount: 50 + Math.floor(Math.random() * 20),
      turnover: Math.floor(Math.random() * 3),
      hiring: Math.floor(Math.random() * 5),
      attendance: { rate: 95 + Math.random() * 4 },
      training: { sessions: Math.floor(Math.random() * 4) + 1, participants: Math.floor(Math.random() * 30) + 10 },
    };
  }

  async conductInterview(context: AgentContext): Promise<{
    questions: string[];
    evaluation: Record<string, number>;
  }> {
    const { position, resume } = context.input as { position: string; resume: string };

    const prompt = `请为以下候选人设计面试问题：

岗位: ${position}
简历摘要: ${resume?.substring(0, 200)}

请返回：
{
  "questions": ["问题1", "问题2", "问题3", "问题4", "问题5"],
  "evaluationCriteria": {
    "technicalSkill": "技术能力评估维度",
    "communication": "沟通能力评估维度",
    "cultureFit": "文化匹配度评估维度"
  }
}`;

    return await chatCompletionJSON([
      { role: 'system', content: '你是面试专家' },
      { role: 'user', content: prompt },
    ]);
  }

  async fullCycle(): Promise<unknown> {
    return {
      resumeScreening: { pending: 5, processed: 12 },
      attendance: { rate: 96.5 },
      pendingRequests: { leave: 3, reimbursement: 2 },
      upcomingInterviews: 2,
      reportGenerated: true,
    };
  }
}
