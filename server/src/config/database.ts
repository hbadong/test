import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

const DB_PATH = path.join(process.cwd(), 'data', 'aieployee.db');

export interface AgentRecord {
  id: string;
  name: string;
  type: string;
  status: string;
  config: string;
  schedule: string | null;
  last_run_at: string | null;
  total_runs: number;
  success_count: number;
  fail_count: number;
  created_at: string;
  updated_at: string;
}

export interface TaskRecord {
  id: string;
  workflow_id: string | null;
  agent_id: string;
  status: string;
  input: string;
  output: string | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface ContentRecord {
  id: string;
  type: string;
  title: string;
  body: string;
  source_agent_id: string | null;
  source_url: string | null;
  tags: string;
  status: string;
  publish_platform: string;
  metrics: string;
  created_at: string;
  updated_at: string;
}

export interface LeadRecord {
  id: string;
  source: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  tags: string;
  intent_level: string;
  status: string;
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRecord {
  id: string;
  name: string;
  description: string;
  nodes: string;
  edges: string;
  is_active: number;
  trigger_type: string;
  trigger_config: string;
  created_at: string;
  updated_at: string;
}

class DatabaseManager {
  private db: Database.Database;
  private static instance: DatabaseManager;

  private constructor() {
    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.initializeTables();
  }

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private initializeTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT DEFAULT 'stopped',
        config TEXT DEFAULT '{}',
        schedule TEXT,
        last_run_at TEXT,
        total_runs INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        fail_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        nodes TEXT DEFAULT '[]',
        edges TEXT DEFAULT '[]',
        is_active INTEGER DEFAULT 0,
        trigger_type TEXT DEFAULT 'manual',
        trigger_config TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        workflow_id TEXT,
        agent_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        input TEXT DEFAULT '{}',
        output TEXT,
        error_message TEXT,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (workflow_id) REFERENCES workflows(id),
        FOREIGN KEY (agent_id) REFERENCES agents(id)
      );

      CREATE TABLE IF NOT EXISTS contents (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT,
        source_agent_id TEXT,
        source_url TEXT,
        tags TEXT DEFAULT '[]',
        status TEXT DEFAULT 'draft',
        publish_platform TEXT DEFAULT '[]',
        metrics TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (source_agent_id) REFERENCES agents(id)
      );

      CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        name TEXT DEFAULT '',
        company TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        email TEXT DEFAULT '',
        tags TEXT DEFAULT '[]',
        intent_level TEXT DEFAULT 'unknown',
        status TEXT DEFAULT 'new',
        notes TEXT,
        assigned_to TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS lead_follow_ups (
        id TEXT PRIMARY KEY,
        lead_id TEXT NOT NULL,
        type TEXT DEFAULT 'other',
        note TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT DEFAULT '',
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Performance indexes
      CREATE INDEX IF NOT EXISTS idx_agents_type_status ON agents(type, status);
      CREATE INDEX IF NOT EXISTS idx_agents_schedule ON agents(schedule) WHERE schedule IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_tasks_agent_id ON tasks(agent_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_contents_source ON contents(source_agent_id);
      CREATE INDEX IF NOT EXISTS idx_contents_status ON contents(status);
      CREATE INDEX IF NOT EXISTS idx_contents_created ON contents(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
      CREATE INDEX IF NOT EXISTS idx_leads_intent ON leads(intent_level);
      CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
      CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_follow_ups_lead ON lead_follow_ups(lead_id);
      CREATE INDEX IF NOT EXISTS idx_follow_ups_created ON lead_follow_ups(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_workflows_active ON workflows(is_active);
    `);

    this.seedDefaultSettings();
    this.seedDefaultAdminUser();
    this.seedDefaultAgents();
  }

  private seedDefaultSettings(): void {
    const stmt = this.db.prepare(`INSERT OR IGNORE INTO settings (key, value, description) VALUES (?, ?, ?)`);

    const defaults = [
      ['llm.api_key', '', '大模型API密钥 (OpenAI/通义千问)'],
      ['llm.provider', 'mock', '大模型服务商: openai | qianwen | mock'],
      ['llm.model', 'gpt-4o', '使用的模型名称'],
      ['llm.api_url', 'https://api.openai.com/v1', 'API基础URL'],
      ['tts.api_key', '', 'TTS服务API密钥'],
      ['tts.provider', 'mock', '语音合成服务商: azure | aliyun | mock'],
      ['tts.voice', 'default', '默认语音音色'],
      ['tts.speed', 'normal', '语音速度: slow | normal | fast'],
      ['vision.api_key', '', 'Vision服务API密钥'],
      ['vision.provider', 'mock', '图像生成服务商: openai | stability | mock'],
      ['vision.model', 'dall-e-3', '图像生成模型'],
      ['vision.api_url', 'https://api.openai.com/v1', 'Vision API基础URL'],
      ['vision.style', 'natural', '图像风格: natural | anime | realistic'],
      ['system.name', 'AI智能体系统', '系统名称'],
      ['system.timezone', 'Asia/Shanghai', '系统时区'],
    ];

    for (const [key, value, desc] of defaults) {
      stmt.run(key, value, desc);
    }
  }

  private seedDefaultAdminUser(): void {
    // Check if any users exist
    const count = this.db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
    if (count.count === 0) {
      // Create default admin user (password: admin123)
      const bcrypt = require('bcryptjs');
      const passwordHash = bcrypt.hashSync('admin123', 10);
      this.db.prepare(
        `INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)`
      ).run('admin_default', 'admin', passwordHash, 'admin');
      logger.info('Default admin user created (username: admin, password: admin123)');
    }
  }

  private seedDefaultAgents(): void {
    const stmt = this.db.prepare(`INSERT OR IGNORE INTO agents (id, name, type, config) VALUES (?, ?, ?, ?)`);

    const agents = [
      ['trend', '一键追爆', 'trend', JSON.stringify({ platforms: ['douyin', 'weibo', 'xiaohongshu'], industries: [] })],
      ['create', 'AI创作', 'create', JSON.stringify({ templates: ['copywriting', 'image', 'script'], platforms: ['douyin', 'xiaohongshu', 'wechat'] })],
      ['avatar', '数字人', 'avatar', JSON.stringify({ avatars: [], voice: 'default', resolution: '1080p' })],
      ['video', '大片自动生成', 'video', JSON.stringify({ style: 'modern', bgm: 'auto', subtitles: true })],
      ['prospect', 'AI拓客', 'prospect', JSON.stringify({ channels: ['enterprise', 'social'], target: {} })],
      ['map-prospect', '地图拓客', 'map-prospect', JSON.stringify({ provider: 'amap', radius: 5000 })],
      ['wechat', 'AI个企微', 'wechat', JSON.stringify({ mode: 'enterprise', autoReply: true, schedule: true })],
      ['hr', 'AI人事', 'hr', JSON.stringify({ modules: ['resume', 'attendance', 'qa'] })],
      ['legal', 'AI法务', 'legal', JSON.stringify({ modules: ['contract-review', 'contract-gen', 'qa'] })],
      ['call', 'AI电销', 'call', JSON.stringify({ voice: 'female', speed: 'normal', retry: 3 })],
      ['live', 'AI直播', 'live', JSON.stringify({ avatar: 'default', autoReply: true, products: [] })],
    ];

    for (const [id, name, type, config] of agents) {
      stmt.run(id, name, type, config);
    }
  }

  getDb(): Database.Database {
    return this.db;
  }

  close(): void {
    this.db.close();
  }
}

export const dbManager = DatabaseManager.getInstance();
export const db: { prepare: Function; exec: Function } = dbManager.getDb() as any;
