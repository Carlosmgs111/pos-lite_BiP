export class ConcurrencyError extends Error {
  constructor(aggregate: string) {
    super(
      `Concurrency conflict on ${aggregate} — another operation modified it first. Retry.`
    );
  }
}
