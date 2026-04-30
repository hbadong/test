import { Router } from 'express';
import { db } from '../config/database';
import { agentRegistry } from '../scheduler/AgentRegistry';
import { TrendAgent } from '../agents/TrendAgent';
import { CreateAgent } from '../agents/CreateAgent';
import { AvatarAgent } from '../agents/AvatarAgent';
import { VideoAgent } from '../agents/VideoAgent';
import { ProspectAgent } from '../agents/ProspectAgent';
import { MapAgent } from '../agents/MapAgent';
import { WeChatAgent } from '../agents/WeChatAgent';
import { HRAgent } from '../agents/HRAgent';
import { LegalAgent } from '../agents/LegalAgent';
import { CallAgent } from '../agents/CallAgent';
import { LiveAgent } from '../agents/LiveAgent';
import { logger } from '../utils/logger';

const router = Router();

const agentClasses: Record<string, new (config: any) => any> = {
  trend: TrendAgent,
  create: CreateAgent,
  avatar: AvatarAgent,
  video: VideoAgent,
  prospect: ProspectAgent,
  'map-prospect': MapAgent,
  wechat: WeChatAgent,
  hr: HRAgent,
  legal: LegalAgent,
  call: CallAgent,
  live: LiveAgent,
};

// Get all agents
router.get('/', (req, res) => {
  const agents = db.prepare('SELECT * FROM agents ORDER BY created_at').all();
  res.json(agents);
});

// Get single agent
router.get('/:id', (req, res) => {
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id) as any;
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
});

// Update agent config
router.put('/:id', (req, res) => {
  const { name, config, schedule, status } = req.body;
  const existing = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Agent not found' });

  const updates: string[] = [];
  const values: unknown[] = [];

  if (name !== undefined) { updates.push('name = ?'); values.push(name); }
  if (config !== undefined) { updates.push('config = ?'); values.push(JSON.stringify(config)); }
  if (schedule !== undefined) { updates.push('schedule = ?'); values.push(schedule); }
  if (status !== undefined) { updates.push('status = ?'); values.push(status); }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    values.push(req.params.id);
    db.prepare(`UPDATE agents SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }

  // Re-register agent if config changed
  initAgent(req.params.id);

  res.json({ success: true });
});

// Execute agent
router.post('/:id/execute', async (req, res) => {
  const agent = agentRegistry.get(req.params.id);
  if (!agent) {
    // Try to initialize
    initAgent(req.params.id);
    const retry = agentRegistry.get(req.params.id);
    if (!retry) return res.status(404).json({ error: 'Agent not found or not initialized' });
  }

  try {
    const result = await (agentRegistry.get(req.params.id)!).run(req.body.input || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Get agent tasks
router.get('/:id/tasks', (req, res) => {
  const tasks = db.prepare(`
    SELECT * FROM tasks WHERE agent_id = ? ORDER BY created_at DESC LIMIT 50
  `).all(req.params.id);
  res.json(tasks);
});

// Get agent types
router.get('/types', (req, res) => {
  const types = [
    { value: 'trend', label: '一键追爆', description: '自动追踪全网热点并生成选题' },
    { value: 'create', label: 'AI创作', description: 'AI文案/图片/脚本创作' },
    { value: 'avatar', label: '数字人', description: 'AI数字人播报视频生成' },
    { value: 'video', label: '大片自动生成', description: '文案自动转视频' },
    { value: 'prospect', label: 'AI拓客', description: '自动寻找并触达潜在客户' },
    { value: 'map-prospect', label: '地图拓客', description: '基于地图POI发现周边客户' },
    { value: 'wechat', label: 'AI个企微', description: '自动管理微信/企微' },
    { value: 'hr', label: 'AI人事', description: 'AI处理日常人事事务' },
    { value: 'legal', label: 'AI法务', description: 'AI辅助法律事务处理' },
    { value: 'call', label: 'AI电销', description: 'AI自动外呼销售' },
    { value: 'live', label: 'AI直播', description: 'AI自动直播带货' },
  ];
  res.json(types);
});

function initAgent(id: string): void {
  const record = db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as any;
  if (!record) return;

  const AgentClass = agentClasses[record.type];
  if (!AgentClass) {
    logger.error(`Unknown agent type: ${record.type}`);
    return;
  }

  const config = {
    id: record.id,
    name: record.name,
    type: record.type,
    enabled: record.status === 'active',
    schedule: record.schedule,
    parameters: typeof record.config === 'string' ? JSON.parse(record.config) : record.config,
  };

  try {
    const agent = new AgentClass(config);
    agentRegistry.register(agent);
  } catch (error) {
    logger.error(`Failed to initialize agent ${record.name}: ${error}`);
  }
}

// Initialize all agents
export function initAllAgents(): void {
  const agents = db.prepare('SELECT * FROM agents').all() as any[];
  for (const agent of agents) {
    initAgent(agent.id);
  }
  logger.info(`Initialized ${agentRegistry.getAll().length} agents`);
}

export default router;
