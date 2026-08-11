import { EventEmitter } from 'events';
import type { EventBus, DomainEvent, DomainEventMap } from './event-bus.interface.js';

class InMemoryEventBus implements EventBus {
  private emitter = new EventEmitter();

  async publish<K extends DomainEvent>(event: K, payload: DomainEventMap[K]): Promise<void> {
    // In-process emission. In Kafka, this would be `producer.send(...)`
    this.emitter.emit(event, payload);
  }

  subscribe<K extends DomainEvent>(event: K, handler: (payload: DomainEventMap[K]) => Promise<void>): void {
    // Handle asynchronously so subscribers don't block the publisher natively
    this.emitter.on(event, async (payload) => {
      try {
        await handler(payload);
      } catch (error) {
        console.error(`Error handling event ${event}:`, error);
        // A Dead Letter Queue strategy would go here
      }
    });
  }
}

export const eventBus: EventBus = new InMemoryEventBus();
