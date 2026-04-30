import { EventEmitter } from 'eventemitter3';
import { logger } from '../utils/logger';

export type EventType =
  | 'agent.started'
  | 'agent.completed'
  | 'agent.failed'
  | 'content.created'
  | 'content.published'
  | 'lead.discovered'
  | 'lead.qualified'
  | 'workflow.triggered'
  | 'workflow.completed'
  | 'schedule.added'
  | 'schedule.removed';

interface EventHandler {
  (payload: unknown): void | Promise<void>;
}

class EventBusClass {
  private emitter = new EventEmitter();

  on(event: EventType, handler: EventHandler): void {
    this.emitter.on(event, handler);
  }

  off(event: EventType, handler: EventHandler): void {
    this.emitter.off(event, handler);
  }

  async emit(event: EventType, payload?: unknown): Promise<void> {
    logger.debug(`Event emitted: ${event}`, payload);
    const handlers = this.emitter.listeners(event);
    for (const handler of handlers) {
      try {
        await (handler as EventHandler)(payload);
      } catch (error) {
        logger.error(`Event handler error for ${event}: ${error}`);
      }
    }
  }
}

export const eventBus = new EventBusClass();
