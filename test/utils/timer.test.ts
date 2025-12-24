import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTimer, measureAsync } from "../../src/utils/timer.js";

describe("timer utilities", () => {
  describe("createTimer", () => {
    it("should return elapsed time in milliseconds", () => {
      const timer = createTimer();
      const elapsed = timer.elapsed();

      assert.equal(typeof elapsed, "number");
      assert.ok(elapsed >= 0, "Elapsed time should be non-negative");
    });

    it("should measure time progression", async () => {
      const timer = createTimer();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const elapsed = timer.elapsed();
      assert.ok(elapsed >= 40, `Expected elapsed >= 40ms, got ${elapsed}ms`);
    });

    it("should return integer milliseconds", () => {
      const timer = createTimer();
      const elapsed = timer.elapsed();

      assert.equal(
        elapsed,
        Math.round(elapsed),
        "Elapsed should be an integer",
      );
    });
  });

  describe("measureAsync", () => {
    it("should return result and elapsed time", async () => {
      const expectedResult = { data: "test" };
      const fn = async () => expectedResult;

      const { result, elapsedMs } = await measureAsync(fn);

      assert.deepEqual(result, expectedResult);
      assert.equal(typeof elapsedMs, "number");
      assert.ok(elapsedMs >= 0);
    });

    it("should measure async function execution time", async () => {
      const fn = async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return "done";
      };

      const { result, elapsedMs } = await measureAsync(fn);

      assert.equal(result, "done");
      assert.ok(elapsedMs >= 40, `Expected elapsedMs >= 40, got ${elapsedMs}`);
    });

    it("should propagate errors from async function", async () => {
      const fn = async () => {
        throw new Error("Test error");
      };

      await assert.rejects(measureAsync(fn), {
        message: "Test error",
      });
    });
  });
});
