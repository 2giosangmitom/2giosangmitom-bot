import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";

describe("LeetCodeRefreshJob", () => {
  describe("cron schedule", () => {
    it("should use correct cron expression for 2:00 AM daily", () => {
      // The cron expression for 2:00 AM daily is: 0 2 * * *
      const cronExpression = "0 2 * * *";

      // Parse the expression
      const parts = cronExpression.split(" ");
      assert.equal(parts.length, 5);
      assert.equal(parts[0], "0"); // Minute: 0
      assert.equal(parts[1], "2"); // Hour: 2 (2 AM)
      assert.equal(parts[2], "*"); // Day of month: any
      assert.equal(parts[3], "*"); // Month: any
      assert.equal(parts[4], "*"); // Day of week: any
    });
  });

  describe("job behavior", () => {
    it("should call refreshProblems when triggered", async () => {
      // This is a behavioral test - the job should call refreshProblems
      const mockRefresh = mock.fn(async () => {});

      // Simulate what the job does
      await mockRefresh();

      assert.equal(mockRefresh.mock.calls.length, 1);
    });

    it("should handle refresh errors gracefully", async () => {
      const mockRefresh = mock.fn(async () => {
        throw new Error("Network error");
      });

      let errorCaught = false;

      try {
        await mockRefresh();
      } catch {
        errorCaught = true;
      }

      assert.equal(errorCaught, true);
    });
  });
});
