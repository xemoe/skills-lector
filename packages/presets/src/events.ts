// packages/presets/src/events.ts
import type { ApplyEvent } from "./types";

export type EventListener = (e: ApplyEvent) => void;

export class ApplyEventBus {
    private listeners: Set<EventListener> = new Set();
    emit(e: ApplyEvent): void {
        for (const fn of this.listeners) {
            try {
                fn(e);
            } catch {
                // listener errors are swallowed — they must not affect the apply
            }
        }
    }
    on(fn: EventListener): () => void {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }
}
