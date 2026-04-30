import cron from 'node-cron';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import { agentRegistry } from './AgentRegistry';
import { workflowEngine } from './WorkflowEngine';

interface ScheduledJob {
  taskId: string;
  cronJob: cron.ScheduledTask;
}

export class TaskScheduler {
  private jobs: Map<string, ScheduledJob> = new Map();

  start(): void {
    logger.info('TaskScheduler starting...');
    this.loadScheduledTasks();
    this.checkWorkflows();

    // Check for new/updated schedules every 30 seconds
    setInterval(() => this.loadScheduledTasks(), 30000);
  }

  stop(): void {
    logger.info('TaskScheduler stopping...');
    for (const [id, job] of this.jobs) {
      job.cronJob.stop();
    }
    this.jobs.clear();
  }

  private loadScheduledTasks(): void {
    const agents = db.prepare(`
      SELECT id, name, type, schedule
      FROM agents
      WHERE status = 'active' AND schedule IS NOT NULL AND schedule != ''
    `).all() as { id: string; name: string; type: string; schedule: string }[];

    const currentIds = new Set(agents.map(a => a.id));

    // Remove old jobs that no longer exist
    for (const [id, job] of this.jobs) {
      if (!currentIds.has(id)) {
        job.cronJob.stop();
        this.jobs.delete(id);
        logger.info(`Removed schedule for agent ${id}`);
      }
    }

    // Add or update jobs
    for (const agent of agents) {
      if (this.jobs.has(agent.id)) continue;

      try {
        const cronJob = cron.schedule(agent.schedule, async () => {
          logger.info(`Cron trigger for agent: ${agent.name}`);
          await this.executeAgent(agent.id, agent.name, agent.type);
        });

        this.jobs.set(agent.id, { taskId: agent.id, cronJob });
        logger.info(`Scheduled agent ${agent.name} with cron: ${agent.schedule}`);
      } catch (error) {
        logger.error(`Invalid cron expression for agent ${agent.name}: ${agent.schedule}`);
      }
    }
  }

  private async executeAgent(id: string, name: string, type: string): Promise<void> {
    const agent = agentRegistry.get(id);
    if (!agent) {
      logger.warn(`Agent ${id} not found in registry`);
      return;
    }

    try {
      await agent.run({ trigger: 'schedule' });
    } catch (error) {
      logger.error(`Scheduled execution failed for ${name}: ${error}`);
    }
  }

  private checkWorkflows(): void {
    // Check and activate workflows with time-based triggers
    const workflows = db.prepare(`
      SELECT id, name, trigger_type, trigger_config
      FROM workflows
      WHERE is_active = 1 AND trigger_type = 'schedule'
    `).all() as { id: string; name: string; trigger_type: string; trigger_config: string }[];

    for (const wf of workflows) {
      try {
        const config = JSON.parse(wf.trigger_config);
        if (config.cron) {
          cron.schedule(config.cron, async () => {
            logger.info(`Workflow trigger: ${wf.name}`);
            await workflowEngine.execute(wf.id);
          });
        }
      } catch (error) {
        logger.error(`Invalid workflow trigger config for ${wf.name}: ${error}`);
      }
    }
  }

  addJob(id: string, cronExpression: string, handler: () => Promise<void>): void {
    if (this.jobs.has(id)) {
      this.jobs.get(id)!.cronJob.stop();
    }

    const cronJob = cron.schedule(cronExpression, handler);
    this.jobs.set(id, { taskId: id, cronJob });
  }

  removeJob(id: string): void {
    const job = this.jobs.get(id);
    if (job) {
      job.cronJob.stop();
      this.jobs.delete(id);
    }
  }
}

export const scheduler = new TaskScheduler();
