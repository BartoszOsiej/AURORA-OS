/**
 * EventBus — the inter-module communication backbone of AURORA OS.
 *
 * A typed publish/subscribe bus. Modules never import each other directly;
 * they communicate exclusively through named events. This keeps the kernel
 * decoupled and makes the whole system testable in isolation.
 */

export type EventHandler<T = unknown> = (payload: T) => void;

interface Subscription {
  once: boolean;
  fn: EventHandler;
}

export class EventBus {
  private handlers = new Map<string, Set<Subscription>>();
  private history: Array<{ event: string; payload: unknown; at: number }> = [];
  private maxHistory = 200;

  /** Subscribe to an event. Returns an unsubscribe function. */
  on<T = unknown>(event: string, fn: EventHandler<T>): () => void {
    return this.subscribe(event, fn, false);
  }

  /** Subscribe to exactly one emission of the event. */
  once<T = unknown>(event: string, fn: EventHandler<T>): () => void {
    return this.subscribe(event, fn, true);
  }

  private subscribe<T = unknown>(event: string, fn: EventHandler<T>, once: boolean): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    const sub: Subscription = { once, fn: fn as EventHandler };
    set.add(sub);
    return () => {
      set.delete(sub);
      if (set.size === 0) this.handlers.delete(event);
    };
  }

  /** Emit an event to all subscribers, synchronously, in order. */
  emit<T = unknown>(event: string, payload?: T): void {
    this.history.push({ event, payload, at: Date.now() });
    if (this.history.length > this.maxHistory) this.history.shift();

    const set = this.handlers.get(event);
    if (!set) return;
    for (const sub of [...set]) {
      try {
        (sub.fn as EventHandler)(payload);
      } catch (err) {
        console.error(`[EventBus] handler for "${event}" threw:`, err);
      }
      if (sub.once) set.delete(sub);
    }
    if (set.size === 0) this.handlers.delete(event);
  }

  /** Emit asynchronously (queued on microtask). */
  emitAsync<T = unknown>(event: string, payload?: T): void {
    queueMicrotask(() => this.emit(event, payload));
  }

  /** Remove every handler for an event. */
  clear(event?: string): void {
    if (event) this.handlers.delete(event);
    else this.handlers.clear();
  }

  /** Number of live subscriptions for an event (testing/telemetry). */
  listenerCount(event: string): number {
    return this.handlers.get(event)?.size ?? 0;
  }

  /** Recent event history (telemetry + debugging). */
  getHistory(): Array<{ event: string; at: number }> {
    return this.history.map((h) => ({ event: h.event, at: h.at }));
  }
}

export const bus = new EventBus();

/** Well-known event names shared across the system. */
export const EV = {
  BOOT_STEP: 'boot:step',
  BOOT_DONE: 'boot:done',
  WINDOW_OPEN: 'window:open',
  WINDOW_CLOSE: 'window:close',
  WINDOW_FOCUS: 'window:focus',
  PROCESS_SPAWN: 'process:spawn',
  PROCESS_EXIT: 'process:exit',
  FS_CHANGED: 'fs:changed',
  THEME_CHANGED: 'theme:changed',
  VOLUME_CHANGED: 'audio:volume',
  APP_LAUNCH: 'app:launch',
  APP_EXIT: 'app:exit',
  SCREENSHOT: 'ui:screenshot',
} as const;
