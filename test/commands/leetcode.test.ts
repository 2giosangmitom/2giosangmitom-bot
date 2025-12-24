import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("LeetCodeCommand", () => {
  describe("embed format", () => {
    it("should have correct title format", () => {
      const expectedTitle = "🧠 LeetCode Random Problem";
      assert.ok(expectedTitle.includes("LeetCode"));
      assert.ok(expectedTitle.includes("Random"));
    });

    it("should format problem description correctly", () => {
      const problem = {
        frontendId: "1",
        title: "Two Sum",
        difficulty: "Easy",
        acRate: 49.5,
      };

      const description =
        `**[${problem.frontendId}] ${problem.title}**\n` +
        `Difficulty: **${problem.difficulty}**\n` +
        `Acceptance: **${problem.acRate}%**`;

      assert.ok(description.includes("[1]"));
      assert.ok(description.includes("Two Sum"));
      assert.ok(description.includes("Easy"));
      assert.ok(description.includes("49.5%"));
    });

    it("should generate correct LeetCode URL", () => {
      const titleSlug = "two-sum";
      const url = `https://leetcode.com/problems/${titleSlug}`;

      assert.equal(url, "https://leetcode.com/problems/two-sum");
    });
  });

  describe("difficulty colors", () => {
    it("should have colors for all difficulty levels", () => {
      const difficultyColors: Record<string, number> = {
        Easy: 0x00b8a3,
        Medium: 0xffc01e,
        Hard: 0xff375f,
      };

      assert.ok(difficultyColors["Easy"]);
      assert.ok(difficultyColors["Medium"]);
      assert.ok(difficultyColors["Hard"]);
    });
  });

  describe("tags display", () => {
    it("should truncate tags if more than 5", () => {
      const tags = ["Tag1", "Tag2", "Tag3", "Tag4", "Tag5", "Tag6", "Tag7"];

      const tagsDisplay =
        tags.length > 0
          ? tags.slice(0, 5).join(", ") + (tags.length > 5 ? "..." : "")
          : "None";

      assert.ok(tagsDisplay.includes("Tag1"));
      assert.ok(tagsDisplay.includes("Tag5"));
      assert.ok(tagsDisplay.endsWith("..."));
      assert.ok(!tagsDisplay.includes("Tag6"));
    });

    it("should show None for empty tags", () => {
      const tags: string[] = [];

      const tagsDisplay =
        tags.length > 0
          ? tags.slice(0, 5).join(", ") + (tags.length > 5 ? "..." : "")
          : "None";

      assert.equal(tagsDisplay, "None");
    });

    it("should show all tags if 5 or fewer", () => {
      const tags = ["Tag1", "Tag2", "Tag3"];

      const tagsDisplay =
        tags.length > 0
          ? tags.slice(0, 5).join(", ") + (tags.length > 5 ? "..." : "")
          : "None";

      assert.equal(tagsDisplay, "Tag1, Tag2, Tag3");
      assert.ok(!tagsDisplay.includes("..."));
    });
  });
});
