import { db } from '../config/database';
import { logger } from '../utils/logger';
import { agentRegistry } from '../scheduler/AgentRegistry';

interface WorkflowNode {
  id: string;
  type: 'trigger' | 'agent' | 'condition' | 'action';
  config: Record<string, unknown>;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
}

class WorkflowEngine {
  async execute(workflowId: string, input?: Record<string, unknown>): Promise<boolean> {
    const wf = db.prepare('SELECT * FROM workflows WHERE id = ?').get(workflowId) as any;
    if (!wf) {
      logger.error(`Workflow ${workflowId} not found`);
      return false;
    }

    const nodes: WorkflowNode[] = JSON.parse(wf.nodes);
    const edges: WorkflowEdge[] = JSON.parse(wf.edges);

    logger.info(`Executing workflow: ${wf.name}`);

    // Find the first agent node
    const agentNodes = nodes.filter(n => n.type === 'agent');

    for (const node of agentNodes) {
      const agentConfig = node.config as { agentId?: string; input?: Record<string, unknown> };
      if (!agentConfig?.agentId) continue;

      const agent = agentRegistry.get(agentConfig.agentId);
      if (!agent) {
        logger.warn(`Agent ${agentConfig.agentId} not found in workflow ${wf.name}`);
        continue;
      }

      try {
        await agent.run({ ...agentConfig.input, ...input, workflowId });
        logger.info(`Workflow ${wf.name}: Agent ${agentConfig.agentId} completed`);
      } catch (error) {
        logger.error(`Workflow ${wf.name}: Agent ${agentConfig.agentId} failed: ${error}`);
      }
    }

    logger.info(`Workflow ${wf.name} completed`);
    return true;
  }

  async create(name: string, description: string, nodes: WorkflowNode[], edges: WorkflowEdge[], triggerType: string, triggerConfig: Record<string, unknown>): Promise<string> {
    const id = `wf_${Date.now()}`;
    db.prepare(`
      INSERT INTO workflows (id, name, description, nodes, edges, is_active, trigger_type, trigger_config)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `).run(id, name, description, JSON.stringify(nodes), JSON.stringify(edges), triggerType, JSON.stringify(triggerConfig));
    return id;
  }

  async toggle(workflowId: string, active: boolean): Promise<void> {
    db.prepare('UPDATE workflows SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ?').run(active ? 1 : 0, workflowId);
  }

  async delete(workflowId: string): Promise<void> {
    db.prepare('DELETE FROM workflows WHERE id = ?').run(workflowId);
  }
}

export const workflowEngine = new WorkflowEngine();
