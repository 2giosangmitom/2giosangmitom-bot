import { afterEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

function stubLogger() {
  return {
    info: mock.fn(() => {}),
    error: mock.fn(() => {}),
    warn: mock.fn(() => {}),
    trace: mock.fn(() => {}),
    fatal: mock.fn(() => {}),
    debug: mock.fn(() => {}),
  };
}

describe("LeetCodeRefreshJob", () => {
  afterEach(() => {
    mock.restoreAll();
    mock.reset();
  });

  it("schedules cron and runs refresh", async () => {
    let scheduledHandler: (() => Promise<void>) | undefined;
    const cron = await import("node-cron");
    const schedule = mock.method(
      cron.default,
      "schedule",
      (expr: string, handler: () => Promise<void>) => {
        scheduledHandler = handler;
        return { stop: mock.fn() } as unknown as ReturnType<
          typeof cron.default.schedule
        >;
      },
    );

    const logger = stubLogger();
    const sapphire = await import("@sapphire/framework");
    sapphire.container.logger =
      logger as unknown as typeof sapphire.container.logger;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(async () => ({
      ok: true,
      json: async () => ({
        data: { problemsetQuestionListV2: { questions: [], totalLength: 0 } },
      }),
    })) as unknown as typeof fetch;

    const { registerLeetCodeRefreshJob } =
      await import("../../src/jobs/leetcode-refresh.job.js");

    registerLeetCodeRefreshJob();

    assert.equal(schedule.mock.calls[0]?.arguments[0], "0 2 * * *");
    await scheduledHandler?.();
    globalThis.fetch = originalFetch;

    assert.ok(logger.info.mock.calls.length > 0);
  });

  it("logs errors when refresh fails", async () => {
    let scheduledHandler: (() => Promise<void>) | undefined;
    const cron = await import("node-cron");
    mock.method(
      cron.default,
      "schedule",
      (_expr: string, handler: () => Promise<void>) => {
        scheduledHandler = handler;
        return { stop: mock.fn() } as unknown as ReturnType<
          typeof cron.default.schedule
        >;
      },
    );

    const logger = stubLogger();
    const sapphire = await import("@sapphire/framework");
    sapphire.container.logger =
      logger as unknown as typeof sapphire.container.logger;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => "boom",
    })) as unknown as typeof fetch;

    const { registerLeetCodeRefreshJob } =
      await import("../../src/jobs/leetcode-refresh.job.js");

    registerLeetCodeRefreshJob();
    await scheduledHandler?.();

    globalThis.fetch = originalFetch;

    assert.ok(logger.error.mock.calls.length > 0);
  });
});
