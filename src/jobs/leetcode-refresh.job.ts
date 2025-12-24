import cron from "node-cron";
import { container } from "@sapphire/framework";
import { refreshProblems } from "../services/leetcode.service.js";

/**
 * Registers the LeetCode refresh cron job.
 * Runs daily at 2:00 AM local time.
 */
export function registerLeetCodeRefreshJob(): void {
  // Schedule: 0 2 * * * = Every day at 2:00 AM
  cron.schedule("0 2 * * *", async () => {
    container.logger.info("[LeetCodeRefreshJob] Cron triggered");

    try {
      await refreshProblems();
      container.logger.info("[LeetCodeRefreshJob] Refresh completed");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      container.logger.error(`[LeetCodeRefreshJob] Failed: ${message}`);
    }
  });

  container.logger.info(
    "[LeetCodeRefreshJob] Scheduled daily refresh at 2:00 AM",
  );
}
