import { BaseAgent, AgentResult, AgentContext, AgentType } from './BaseAgent';
import { chatCompletion, chatCompletionJSON } from '../integrations/llm';
import { db } from '../config/database';
import { logger } from '../utils/logger';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  description: string;
  stock: number;
}

interface LiveStats {
  viewers: number;
  peakViewers: number;
  comments: number;
  likes: number;
  orders: number;
  revenue: number;
  avgWatchTime: number;
}

export class LiveAgent extends BaseAgent {
  readonly type: AgentType = 'live';

  async execute(context: AgentContext): Promise<AgentResult> {
    logger.info('[LiveAgent] Starting AI live streaming...');

    const { action } = context.input as {
      action?: 'start' | 'stop' | 'product-talk' | 'reply-comment' | 'adjust-strategy' | 'report';
    };

    try {
      let result: unknown;

      switch (action) {
        case 'start':
          result = await this.startLive(context);
          break;
        case 'stop':
          result = await this.stopLive();
          break;
        case 'product-talk':
          result = await this.productTalk(context);
          break;
        case 'reply-comment':
          result = await this.replyComment(context);
          break;
        case 'adjust-strategy':
          result = await this.adjustStrategy(context);
          break;
        case 'report':
          result = await this.generateReport();
          break;
        default:
          result = await this.fullCycle();
      }

      return { success: true, data: result, metrics: { duration: 0, itemsProcessed: 1, itemsSucceeded: 1, itemsFailed: 0 } };
    } catch (error) {
      logger.error(`[LiveAgent] Error: ${error}`);
      return { success: false, error: String(error) };
    }
  }

  async startLive(context: AgentContext): Promise<{
    liveId: string;
    status: string;
    avatar: string;
    products: Product[];
    schedule: string;
  }> {
    const { products, duration, avatar } = context.input as {
      products?: Product[];
      duration?: number;
      avatar?: string;
    };

    const liveId = `live_${Date.now()}`;
    logger.info(`[LiveAgent] Starting live stream: ${liveId}`);

    const productList = products || this.getDefaultProducts();

    return {
      liveId,
      status: 'streaming',
      avatar: avatar || 'female-anchor',
      products: productList.slice(0, 10),
      schedule: `${duration || 4}小时`,
    };
  }

  async stopLive(): Promise<{ liveId: string; duration: number; finalStats: LiveStats }> {
    logger.info('[LiveAgent] Stopping live stream...');

    return {
      liveId: 'live_current',
      duration: 14400,
      finalStats: {
        viewers: 12500,
        peakViewers: 3200,
        comments: 8900,
        likes: 45000,
        orders: 156,
        revenue: 28900,
        avgWatchTime: 420,
      },
    };
  }

  async productTalk(context: AgentContext): Promise<{ script: string; keyPoints: string[]; cta: string }> {
    const { product } = context.input as { product?: Product };
    const p = product || this.getDefaultProducts()[0];

    const prompt = `请为以下商品生成直播带货话术：

商品名称: ${p.name}
价格: ¥${p.price} (原价: ¥${p.originalPrice})
描述: ${p.description}

要求：
1. 开场吸引注意力
2. 突出产品卖点(3-5个)
3. 价格对比，体现优惠
4. 限时限量紧迫感
5. 明确的购买指引
6. 总时长约2-3分钟的口播

请以JSON格式返回：
{
  "script": "完整话术",
  "keyPoints": ["卖点1", "卖点2", "卖点3"],
  "cta": "购买引导话术"
}`;

    return await chatCompletionJSON([
      { role: 'system', content: '你是顶级直播带货主播，话术感染力强，转化率高。' },
      { role: 'user', content: prompt },
    ]);
  }

  async replyComment(context: AgentContext): Promise<{ comment: string; reply: string; action: string }> {
    const { comment } = context.input as { comment: string };

    if (!comment) {
      return { comment: '', reply: '欢迎新进直播间的朋友们！', action: 'welcome' };
    }

    const prompt = `在直播带货场景中，请回复以下观众评论：

评论: ${comment}

请判断评论类型并生成回复：
- 价格询问: 热情报价+强调优惠
- 质量疑问: 真诚回答+提供保障
- 购买犹豫: 打消顾虑+限时逼单
- 物流咨询: 详细解答
- 普通互动: 友好回应

请以JSON格式返回：
{
  "reply": "回复话术",
  "action": "reply|pin|ignore|notify"
}`;

    return await chatCompletionJSON([
      { role: 'system', content: '你是直播互动助手，回复简短有力，带动直播间氛围。' },
      { role: 'user', content: prompt },
    ]);
  }

  async adjustStrategy(context: AgentContext): Promise<{
    currentPhase: string;
    action: string;
    reason: string;
  }> {
    const { viewers, conversionRate, timeRemaining } = context.input as {
      viewers?: number;
      conversionRate?: number;
      timeRemaining?: number;
    };

    const v = viewers || 100;
    const cr = conversionRate || 2;

    if (v < 50) {
      return {
        currentPhase: 'low-traffic',
        action: '增加互动环节，发放福利红包，引导关注分享',
        reason: '当前流量较低，需要提高留存和吸引新观众',
      };
    }

    if (cr < 1 && timeRemaining && timeRemaining < 3600) {
      return {
        currentPhase: 'closing',
        action: '切换逼单话术，强调限时优惠，制造紧迫感',
        reason: '转化率偏低且时间不足，需要加大转化力度',
      };
    }

    if (cr > 3) {
      return {
        currentPhase: 'high-conversion',
        action: '维持当前节奏，适当加快过品速度',
        reason: '转化率良好，趁热打铁',
      };
    }

    return {
      currentPhase: 'normal',
      action: '按正常节奏介绍商品，保持互动',
      reason: '各项指标正常',
    };
  }

  async generateReport(): Promise<{
    sessions: number;
    totalViewers: number;
    totalRevenue: number;
    avgConversionRate: number;
    topProducts: { name: string; sales: number; revenue: number }[];
  }> {
    return {
      sessions: 30,
      totalViewers: 450000,
      totalRevenue: 890000,
      avgConversionRate: 2.8,
      topProducts: [
        { name: '爆款商品A', sales: 520, revenue: 156000 },
        { name: '人气商品B', sales: 380, revenue: 95000 },
        { name: '新品C', sales: 210, revenue: 63000 },
      ],
    };
  }

  async fullCycle(): Promise<unknown> {
    return {
      status: 'streaming',
      currentViewers: 1250,
      peakViewers: 3200,
      currentProduct: '爆款商品A',
      orders: 156,
      revenue: 28900,
      nextProduct: '人气商品B',
    };
  }

  private getDefaultProducts(): Product[] {
    return [
      { id: 'p1', name: '智能保温杯', price: 69, originalPrice: 129, description: '316不锈钢，12小时保温，一键开盖', stock: 500 },
      { id: 'p2', name: '无线蓝牙耳机', price: 99, originalPrice: 199, description: '降噪版，续航30小时，触控操作', stock: 300 },
      { id: 'p3', name: '电动牙刷套装', price: 79, originalPrice: 159, description: '声波震动，5档调节，含4刷头', stock: 200 },
      { id: 'p4', name: '便携榨汁机', price: 59, originalPrice: 119, description: '迷你便携，USB充电，30秒榨汁', stock: 400 },
      { id: 'p5', name: '记忆棉枕头', price: 89, originalPrice: 179, description: '慢回弹，护颈设计，可拆洗枕套', stock: 150 },
    ];
  }
}
