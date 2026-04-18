/**
 * Encapsulates the lifecycle of a Server-Sent Events stream.
 *
 * Owns the controller, encoder, keep-alive timer, and close state.
 * All writes are safe against race conditions (closed controller,
 * queued timers, concurrent event handlers).
 *
 * Supports native SSE event types via `sendEvent(type, data)`.
 */
export class SSEStreamAdapter {
  private closed = false;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private cleanupFns: (() => void)[] = [];
  private encoder = new TextEncoder();

  constructor(
    private controller: ReadableStreamDefaultController,
    keepAliveMs = 30_000
  ) {
    this.keepAliveTimer = setInterval(() => {
      this.write(": keep-alive\n\n");
    }, keepAliveMs);
  }

  /** Send a named SSE event (uses `event:` + `data:` fields). */
  sendEvent(type: string, data: unknown): void {
    this.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  onClose(fn: () => void): void {
    this.cleanupFns.push(fn);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;

    if (this.keepAliveTimer) clearInterval(this.keepAliveTimer);

    for (const fn of this.cleanupFns) {
      try { fn(); } catch { /* tolerate cleanup errors */ }
    }

    try {
      this.controller.close();
    } catch {
      // Already closed — safe to ignore
    }
  }

  private write(chunk: string): void {
    if (this.closed) return;
    try {
      this.controller.enqueue(this.encoder.encode(chunk));
    } catch {
      this.close();
    }
  }
}
