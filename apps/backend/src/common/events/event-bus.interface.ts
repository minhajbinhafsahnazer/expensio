// Define strict domain event types
export type DomainEventMap = {
  'transaction.created': { id: string; amount: number; userId: string };
  'transaction.deleted': { id: string; userId: string };
  'user.registered': { id: string; email: string };
};

export type DomainEvent = keyof DomainEventMap;

/**
 * Abstract EventBus interface.
 * Currently backed by EventEmitter in-process. 
 * Can be swapped for Kafka, RabbitMQ, or Redis later without changing application logic.
 */
export interface EventBus {
  publish<K extends DomainEvent>(event: K, payload: DomainEventMap[K]): Promise<void>;
  subscribe<K extends DomainEvent>(event: K, handler: (payload: DomainEventMap[K]) => Promise<void>): void;
}
