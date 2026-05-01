import { db } from '../config/database';
import { logger } from '../utils/logger';

const AGENT_TYPES = ['trend', 'create', 'avatar', 'video', 'prospect', 'map-prospect', 'wechat', 'hr', 'legal', 'call', 'live'];
const CONTENT_TYPES = ['article', 'image', 'video', 'script', 'copywriting'];
const LEAD_SOURCES = ['prospect', 'map-prospect', 'import', 'wechat', 'call'];
const PLATFORMS = ['douyin', 'xiaohongshu', 'wechat', 'weibo', 'kuaishou', 'bilibili'];
const COMPANIES = ['北京科技有限公司', '上海创新科技', '深圳智能制造', '杭州电商集团', '广州传媒有限公司', '成都数据服务', '武汉人工智能', '南京云计算', '苏州芯片设计', '重庆物联网'];
const NAMES = ['张伟', '李娜', '王芳', '刘洋', '陈静', '杨帆', '赵磊', '黄丽', '周涛', '吴敏', '徐强', '孙艳', '马超', '朱婷', '胡军', '郭霞', '林峰', '何琳', '高鹏', '罗雪'];
const TASK_STATUSES = ['success', 'failed', 'running'];
const CONTENT_STATUSES = ['published', 'draft', 'pending'];
const LEAD_INTENT_LEVELS = ['high', 'medium', 'low', 'unknown'];
const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'];

function randomDate(daysBack: number): string {
  const now = new Date();
  const past = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const random = new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
  return random.toISOString().slice(0, 19).replace('T', ' ');
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function seedTasks() {
  const agents = db.prepare('SELECT id, type FROM agents').all() as any[];
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO tasks (id, agent_id, status, input, output, error_message, started_at, completed_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const taskTemplates: Record<string, { input: string; output: string }> = {
    trend: {
      input: '{"keywords": ["AI", "自动化", "营销"], "platform": "douyin"}',
      output: '{"trends": [{"title": "AI营销新趋势", "views": 1250000, "engagement": 0.08}]}'
    },
    create: {
      input: '{"topic": "产品推广", "style": "professional", "platform": "xiaohongshu"}',
      output: '{"content": "AI赋能新时代，让你的品牌脱颖而出...", "images": 3}'
    },
    avatar: {
      input: '{"script": "欢迎来到我们的直播间", "voice": "female", "duration": 30}',
      output: '{"video_url": "/uploads/avatar_001.mp4", "duration": 30}'
    },
    video: {
      input: '{"theme": "产品展示", "style": "modern", "music": "upbeat"}',
      output: '{"video_url": "/uploads/video_001.mp4", "duration": 60, "resolution": "1080p"}'
    },
    prospect: {
      input: '{"industry": "科技", "region": "北京", "target_count": 50}',
      output: '{"leads_found": 47, "high_intent": 12, "medium_intent": 23}'
    },
    'map-prospect': {
      input: '{"center": "北京CBD", "radius": 5000, "category": "科技公司"}',
      output: '{"companies_found": 89, "with_contact": 56}'
    },
    wechat: {
      input: '{"mode": "auto_reply", "trigger": "关键词"}',
      output: '{"replied": 23, "converted": 5}'
    },
    hr: {
      input: '{"task": "resume_screening", "position": "前端工程师"}',
      output: '{"screened": 45, "qualified": 12, "recommended": 5}'
    },
    legal: {
      input: '{"task": "contract_review", "type": "service_agreement"}',
      output: '{"risks_found": 3, "suggestions": 7, "risk_level": "medium"}'
    },
    call: {
      input: '{"list": "lead_batch_001", "script": "sales_intro"}',
      output: '{"called": 50, "connected": 28, "interested": 8}'
    },
    live: {
      input: '{"products": ["product_a", "product_b"], "duration": 120}',
      output: '{"viewers": 3500, "orders": 45, "revenue": 12800}'
    },
  };

  let count = 0;
  const now = new Date();

  for (let day = 0; day < 30; day++) {
    const date = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
    const dayStr = date.toISOString().slice(0, 10);

    // Each agent generates 1-5 tasks per day
    for (const agent of agents) {
      const taskCount = randomInt(0, 4);
      for (let t = 0; t < taskCount; t++) {
        const id = `task_${dayStr}_${agent.id}_${t}`;
        const status = Math.random() > 0.15 ? 'success' : Math.random() > 0.5 ? 'failed' : 'running';
        const template = taskTemplates[agent.type] || { input: '{}', output: '{}' };

        const startedAt = `${dayStr} ${String(randomInt(8, 22))}:${String(randomInt(0, 59)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}`;
        const completedAt = status !== 'running'
          ? `${dayStr} ${String(randomInt(8, 22))}:${String(randomInt(0, 59)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}`
          : null;

        stmt.run(id, agent.id, status, template.input, template.output, status === 'failed' ? 'API 超时或资源不足' : null, startedAt, completedAt, startedAt);
        count++;
      }
    }
  }

  logger.info(`Seeded ${count} tasks`);
}

function seedContents() {
  const agents = db.prepare('SELECT id, type FROM agents').all() as any[];
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO contents (id, type, title, body, source_agent_id, source_url, tags, status, publish_platform, metrics, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const titleTemplates: Record<string, string[]> = {
    article: ['AI赋能{topic}的5个关键策略', '2026年{topic}行业趋势深度解析', '如何利用{topic}实现业务增长10倍', '{topic}最佳实践：从入门到精通', '一文读懂{topic}的核心价值'],
    image: ['{topic}主题海报设计', '{topic}产品宣传图', '{topic}社交媒体封面', '{topic}活动Banner', '{topic}品牌视觉方案'],
    video: ['{topic}产品演示视频', '{topic}用户案例分享', '{topic}行业洞察短片', '{topic}品牌故事', '{topic}教程系列'],
    script: ['{topic}直播话术脚本', '{topic}短视频文案', '{topic}广告创意脚本', '{topic}产品介绍文案', '{topic}营销活动脚本'],
    copywriting: ['{topic}朋友圈文案', '{topic}小红书种草文', '{topic}公众号推文', '{topic}微博话题文案', '{topic}电商详情页'],
  };

  const topics = ['人工智能', '数字化转型', '电商运营', '品牌营销', '社交媒体', '智能客服', '数据分析', '自动化办公'];

  let count = 0;
  for (let i = 0; i < 80; i++) {
    const type = randomChoice(CONTENT_TYPES);
    const sourceAgent = randomChoice(agents);
    const topic = randomChoice(topics);
    const titles = titleTemplates[type] || titleTemplates.article;
    const title = randomChoice(titles).replace('{topic}', topic);
    const status = randomChoice(CONTENT_STATUSES);
    const platform = JSON.stringify([randomChoice(PLATFORMS), randomChoice(PLATFORMS)]);
    const tags = JSON.stringify([topic, type, randomChoice(['热门', '精选', '新品', '推荐'])]);

    const views = randomInt(100, 50000);
    const likes = randomInt(10, Math.floor(views * 0.1));
    const shares = randomInt(0, Math.floor(views * 0.05));
    const metrics = JSON.stringify({ views, likes, shares, comments: randomInt(0, Math.floor(views * 0.02)) });

    const createdAt = randomDate(30);
    stmt.run(
      `content_${i}_${Date.now().toString(36)}`,
      type,
      title,
      `这是关于${topic}的${type}内容，由AI智能体自动生成...`,
      sourceAgent.id,
      `https://example.com/content/${i}`,
      tags,
      status,
      platform,
      metrics,
      createdAt,
      createdAt
    );
    count++;
  }

  logger.info(`Seeded ${count} contents`);
}

function seedLeads() {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO leads (id, source, name, company, phone, email, tags, intent_level, status, notes, assigned_to, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let count = 0;
  for (let i = 0; i < 60; i++) {
    const name = randomChoice(NAMES);
    const company = randomChoice(COMPANIES);
    const source = randomChoice(LEAD_SOURCES);
    const intentLevel = randomChoice(LEAD_INTENT_LEVELS);
    const status = randomChoice(LEAD_STATUSES);
    const phone = `1${randomChoice([3, 5, 7, 8, 9])}${String(randomInt(100000000, 999999999))}`;
    const email = `${name.toLowerCase()}@${randomChoice(['company.com', 'tech.cn', 'business.com', 'corp.net'])}`;
    const tags = JSON.stringify([randomChoice(['高价值', '新客户', '复购', '企业客户', '个人客户']), randomChoice(['北京', '上海', '深圳', '杭州', '广州'])]);
    const notes = status === 'converted' ? '已签约，合同金额待确认' : status === 'qualified' ? '需求明确，进入报价阶段' : null;

    const createdAt = randomDate(30);
    stmt.run(
      `lead_${i}_${Date.now().toString(36)}`,
      source,
      name,
      company,
      phone,
      email,
      tags,
      intentLevel,
      status,
      notes,
      null,
      createdAt,
      createdAt
    );
    count++;
  }

  logger.info(`Seeded ${count} leads`);
}

function seedWorkflows() {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO workflows (id, name, description, nodes, edges, is_active, trigger_type, trigger_config, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const workflows = [
    {
      id: 'wf_content_pipeline',
      name: '内容生产流水线',
      description: '自动追热点 -> 创作内容 -> 多平台发布 -> 数据分析',
      nodes: JSON.stringify([
        { id: 'node_1', type: 'trigger', label: '热点触发', x: 100, y: 200 },
        { id: 'node_2', type: 'agent', label: 'AI创作', x: 300, y: 200, agentType: 'create' },
        { id: 'node_3', type: 'agent', label: '数字人生成', x: 500, y: 100, agentType: 'avatar' },
        { id: 'node_4', type: 'action', label: '多平台发布', x: 700, y: 200 },
        { id: 'node_5', type: 'analytics', label: '数据反馈', x: 900, y: 200 },
      ]),
      edges: JSON.stringify([
        { from: 'node_1', to: 'node_2' },
        { from: 'node_2', to: 'node_3' },
        { from: 'node_3', to: 'node_4' },
        { from: 'node_4', to: 'node_5' },
      ]),
      is_active: 1,
      trigger_type: 'schedule',
      trigger_config: JSON.stringify({ cron: '0 9 * * *' }),
    },
    {
      id: 'wf_lead_gen',
      name: '智能拓客流程',
      description: '地图搜索 -> AI分析意向 -> 自动跟进 -> 线索入库',
      nodes: JSON.stringify([
        { id: 'node_1', type: 'trigger', label: '定时触发', x: 100, y: 200 },
        { id: 'node_2', type: 'agent', label: '地图拓客', x: 300, y: 200, agentType: 'map-prospect' },
        { id: 'node_3', type: 'agent', label: 'AI拓客分析', x: 500, y: 200, agentType: 'prospect' },
        { id: 'node_4', type: 'condition', label: '意向评分', x: 700, y: 200 },
        { id: 'node_5', type: 'agent', label: 'AI电销跟进', x: 900, y: 100, agentType: 'call' },
        { id: 'node_6', type: 'action', label: '线索入库', x: 900, y: 300 },
      ]),
      edges: JSON.stringify([
        { from: 'node_1', to: 'node_2' },
        { from: 'node_2', to: 'node_3' },
        { from: 'node_3', to: 'node_4' },
        { from: 'node_4', to: 'node_5', condition: 'high' },
        { from: 'node_4', to: 'node_6', condition: 'medium' },
      ]),
      is_active: 1,
      trigger_type: 'schedule',
      trigger_config: JSON.stringify({ cron: '0 10 * * 1-5' }),
    },
    {
      id: 'wf_live_stream',
      name: 'AI直播自动化',
      description: '选品 -> 生成脚本 -> 数字人直播 -> 实时互动 -> 订单处理',
      nodes: JSON.stringify([
        { id: 'node_1', type: 'trigger', label: '手动启动', x: 100, y: 200 },
        { id: 'node_2', type: 'action', label: '智能选品', x: 300, y: 200 },
        { id: 'node_3', type: 'agent', label: '生成直播脚本', x: 500, y: 200, agentType: 'create' },
        { id: 'node_4', type: 'agent', label: 'AI直播', x: 700, y: 200, agentType: 'live' },
        { id: 'node_5', type: 'agent', label: '实时客服', x: 900, y: 100, agentType: 'wechat' },
        { id: 'node_6', type: 'action', label: '订单处理', x: 900, y: 300 },
      ]),
      edges: JSON.stringify([
        { from: 'node_1', to: 'node_2' },
        { from: 'node_2', to: 'node_3' },
        { from: 'node_3', to: 'node_4' },
        { from: 'node_4', to: 'node_5' },
        { from: 'node_4', to: 'node_6' },
      ]),
      is_active: 0,
      trigger_type: 'manual',
      trigger_config: JSON.stringify({}),
    },
  ];

  let count = 0;
  for (const wf of workflows) {
    const now = randomDate(30);
    stmt.run(wf.id, wf.name, wf.description, wf.nodes, wf.edges, wf.is_active, wf.trigger_type, wf.trigger_config, now, now);
    count++;
  }

  logger.info(`Seeded ${count} workflows`);
}

function updateAgentStats() {
  const agents = db.prepare('SELECT id FROM agents').all() as any[];

  for (const agent of agents) {
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_runs,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as fail_count,
        MAX(completed_at) as last_run_at
      FROM tasks WHERE agent_id = ?
    `).get(agent.id) as any;

    db.prepare(`
      UPDATE agents SET total_runs = ?, success_count = ?, fail_count = ?, last_run_at = ?,
        updated_at = datetime('now'), status = ?
      WHERE id = ?
    `).run(stats.total_runs || 0, stats.success_count || 0, stats.fail_count || 0, stats.last_run_at, Math.random() > 0.3 ? 'active' : 'stopped', agent.id);
  }

  logger.info('Updated agent statistics from seeded data');
}

export function seedAllData() {
  logger.info('Starting data seeding...');

  // Check if data already exists
  const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks').get() as any;
  if (taskCount.count > 100) {
    logger.info('Data already seeded, skipping...');
    return;
  }

  seedTasks();
  seedContents();
  seedLeads();
  seedWorkflows();
  updateAgentStats();

  logger.info('Data seeding completed!');
}
