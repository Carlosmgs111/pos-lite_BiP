import type { EventHandler } from "./EventHandler";

export interface EventBus {
    publish(event: any): Promise<void>;
    subscribe(event: string, handler: EventHandler<any>): void;
}