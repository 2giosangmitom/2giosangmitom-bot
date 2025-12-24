/**
 * Creates a timer for measuring elapsed time.
 * Uses performance.now() for high-resolution timing.
 */
export interface Timer {
  /**
   * Returns elapsed time in milliseconds since timer creation.
   */
  elapsed(): number;
}

/**
 * Creates a new timer that starts immediately.
 * @returns Timer instance with elapsed() method
 */
export function createTimer(): Timer {
  const start = performance.now();

  return {
    elapsed(): number {
      return Math.round(performance.now() - start);
    },
  };
}

/**
 * Measures the execution time of an async function.
 * @param fn - Async function to measure
 * @returns Result of the function and elapsed time in milliseconds
 */
export async function measureAsync<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; elapsedMs: number }> {
  const timer = createTimer();
  const result = await fn();
  return {
    result,
    elapsedMs: timer.elapsed(),
  };
}
