import { showToast } from "../stores/toast";

export class EventListener {
  private lastErrorToast = 0;
  private source: EventSource | null = null;
  private handlers: Record<string, (data: Record<string, unknown>) => void> =
    {};

  constructor(private url: string) {}

  on(
    eventType: string,
    handler: (data: Record<string, unknown>) => void
  ): void {
    this.handlers[eventType] = handler;
  }

  connect(): void {
    if (this.source) return;

    this.source = new EventSource(this.url);

    // Register each handler as a native SSE event listener
    for (const [type, handler] of Object.entries(this.handlers)) {
      this.source.addEventListener(type, (e) => {
        const me = e as MessageEvent;
        if (!me.data) return;
        try {
          handler(JSON.parse(me.data));
        } catch {
          /* malformed payload — ignore */
        }
      });
    }

    this.source.onerror = () => {
      const now = Date.now();
      if (now - this.lastErrorToast > 5000) {
        showToast("Reconectando con el servidor...", "info");
        this.lastErrorToast = now;
      }
    };
  }

  close(): void {
    if (this.source) {
      this.source.close();
      this.source = null;
    }
  }
}
