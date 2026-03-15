import { sleep } from "./utils.js";

export class RateLimiter {
  private nextAllowedTime = 0;
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly intervalMs: number) {}

  async wait(): Promise<void> {
    if (this.intervalMs <= 0) {
      return;
    }

    this.queue = this.queue.then(async () => {
      const now = Date.now();
      const waitMs = Math.max(0, this.nextAllowedTime - now);

      if (waitMs > 0) {
        await sleep(waitMs);
      }

      this.nextAllowedTime = Date.now() + this.intervalMs;
    });

    await this.queue;
  }
}
