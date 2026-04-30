import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database';
import { logger } from '../utils/logger';

export type AgentType =
  | 'trend'
  | 'create'
  | 'avatar'
  | 'video'
  | 'prospect'
  | 'map-prospect'
  | 'wechat'
  | 'hr'
  | 'legal'
  | 'call'
  | 'live';

export interface AgentConfig {
  id: string;
  name: string;
  type: AgentType;
  enabled: boolean;
  schedule?: string;
  parameters: Record<string, unknown>;
}

export interface AgentMetrics {
  duration: number;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
}

export interface AgentResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metrics?: AgentMetrics;
}

export interface AgentContext {
  taskId: string;
  agentId: string;
  input: Record<string, unknown>;
  settings: Record<string, string>;
  signal?: AbortSignal;
}

export type AgentStatus = 'idle' | 'running' | 'paused' | 'error';

export abstract class BaseAgent {
  abstract readonly type: AgentType;
  protected status: AgentStatus = 'idle';
  protected config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  abstract execute(context: AgentContext): Promise<AgentResult>;

  validateConfig(config: AgentConfig): boolean {
    return !!(config.id && config.name && config.type);
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  getConfig(): AgentConfig {
    return this.config;
  }

  updateConfig(partial: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...partial };
    this.saveConfig();
  }

  pause(): void {
    if (this.status === 'running') return;
    this.status = 'paused';
    this.updateAgentStatus('paused');
    logger.info(`Agent [${this.config.name}] paused`);
  }

  resume(): void {
    this.status = 'idle';
    this.updateAgentStatus('active');
    logger.info(`Agent [${this.config.name}] resumed`);
  }

  stop(): void {
    this.status = 'idle';
    this.updateAgentStatus('stopped');
    logger.info(`Agent [${this.config.name}] stopped`);
  }

  async run(input: Record<string, unknown> = {}): Promise<AgentResult> {
    const startTime = Date.now();
    const taskId = uuidv4();
    const settings = this.loadSettings();

    logger.info(`Agent [${this.config.name}] starting task ${taskId}`);
    this.status = 'running';
    this.updateAgentStatus('active');

    // Record task start
    db.prepare(`
      INSERT INTO tasks (id, agent_id, status, input, started_at)
      VALUES (?, ?, 'running', ?, datetime('now'))
    `).run(taskId, this.config.id, JSON.stringify(input));

    try {
      const context: AgentContext = {
        taskId,
        agentId: this.config.id,
        input,
        settings,
      };

      const result = await this.execute(context);
      const duration = Date.now() - startTime;

      // Record task completion
      db.prepare(`
        UPDATE tasks
        SET status = ?, output = ?, completed_at = datetime('now')
        WHERE id = ?
      `).run(
        result.success ? 'success' : 'failed',
        JSON.stringify(result.data),
        taskId
      );

      // Update agent stats
      db.prepare(`
        UPDATE agents
        SET last_run_at = datetime('now'),
            total_runs = total_runs + 1,
            success_count = success_count + ?,
            fail_count = fail_count + ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(result.success ? 1 : 0, result.success ? 0 : 1, this.config.id);

      result.metrics = {
        duration,
        itemsProcessed: result.metrics?.itemsProcessed || 1,
        itemsSucceeded: result.metrics?.itemsSucceeded || (result.success ? 1 : 0),
        itemsFailed: result.metrics?.itemsFailed || (result.success ? 0 : 1),
      };

      this.status = 'idle';
      logger.info(`Agent [${this.config.name}] completed task ${taskId} in ${duration}ms`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      db.prepare(`
        UPDATE tasks
        SET status = 'failed', error_message = ?, completed_at = datetime('now')
        WHERE id = ?
      `).run(errorMessage, taskId);

      db.prepare(`
        UPDATE agents
        SET last_run_at = datetime('now'),
            total_runs = total_runs + 1,
            fail_count = fail_count + 1,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(this.config.id);

      this.status = 'error';
      logger.error(`Agent [${this.config.name}] failed task ${taskId}: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        metrics: {
          duration,
          itemsProcessed: 1,
          itemsSucceeded: 0,
          itemsFailed: 1,
        },
      };
    }
  }

  protected loadSettings(): Record<string, string> {
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  }

  protected getSetting(key: string): string | undefined {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value;
  }

  private updateAgentStatus(status: string): void {
    db.prepare(`UPDATE agents SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, this.config.id);
  }

  private saveConfig(): void {
    db.prepare(`UPDATE agents SET config = ?, updated_at = datetime('now') WHERE id = ?`).run(
      JSON.stringify(this.config.parameters),
      this.config.id
    );
  }
}
