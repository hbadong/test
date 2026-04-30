import { BaseAgent } from '../agents/BaseAgent';
import { db } from '../config/database';
import { logger } from '../utils/logger';

class AgentRegistryClass {
  private agents: Map<string, BaseAgent> = new Map();

  register(agent: BaseAgent): void {
    this.agents.set(agent.getConfig().id, agent);
    logger.info(`Agent registered: ${agent.getConfig().name} [${agent.getConfig().type}]`);
  }

  get(id: string): BaseAgent | undefined {
    return this.agents.get(id);
  }

  getAll(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  getByType(type: string): BaseAgent | undefined {
    for (const agent of this.agents.values()) {
      if (agent.getConfig().type === type) return agent;
    }
    return undefined;
  }

  async initFromDB(): Promise<void> {
    const agents = db.prepare('SELECT * FROM agents').all() as any[];
    logger.info(`Initializing ${agents.length} agents from database...`);
  }
}

export const agentRegistry = new AgentRegistryClass();
