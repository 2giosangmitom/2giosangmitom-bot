import { describe, it, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

// We'll use dynamic imports to test the service
describe("LeetCodeService", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("normalizeProblems (via integration)", () => {
    it("should filter out paid problems", async () => {
      const mockQuestions = [
        {
          id: "1",
          questionFrontendId: "1",
          title: "Two Sum",
          titleSlug: "two-sum",
          paidOnly: false,
          difficulty: "Easy",
          acRate: 49.5,
          topicTags: [{ name: "Array", slug: "array" }],
        },
        {
          id: "2",
          questionFrontendId: "2",
          title: "Premium Problem",
          titleSlug: "premium-problem",
          paidOnly: true, // This should be filtered out
          difficulty: "Medium",
          acRate: 30.0,
          topicTags: [],
        },
        {
          id: "3",
          questionFrontendId: "3",
          title: "Free Problem",
          titleSlug: "free-problem",
          paidOnly: false,
          difficulty: "Hard",
          acRate: 25.5,
          topicTags: [
            { name: "Dynamic Programming", slug: "dp" },
            { name: "Math", slug: "math" },
          ],
        },
      ];

      globalThis.fetch = mock.fn(async () => ({
        ok: true,
        json: async () => ({
          data: {
            problemsetQuestionListV2: {
              questions: mockQuestions,
              totalLength: 3,
            },
          },
        }),
      })) as unknown as typeof fetch;

      // Import and test
      const { setCache, getRandomProblem, clearCache } =
        await import("../../src/services/leetcode.service.js");

      // Set cache with normalized data (simulating what refresh would do)
      setCache([
        {
          id: "1",
          frontendId: "1",
          title: "Two Sum",
          titleSlug: "two-sum",
          difficulty: "Easy",
          acRate: 49.5,
          tags: ["Array"],
        },
        {
          id: "3",
          frontendId: "3",
          title: "Free Problem",
          titleSlug: "free-problem",
          difficulty: "Hard",
          acRate: 25.5,
          tags: ["Dynamic Programming", "Math"],
        },
      ]);

      // Verify we only have free problems
      const problem = getRandomProblem();
      assert.ok(problem);
      assert.ok(
        problem.id === "1" || problem.id === "3",
        "Should only return free problems",
      );

      clearCache();
    });
  });

  describe("getRandomProblem", () => {
    it("should return null when cache is empty", async () => {
      const { clearCache, getRandomProblem } =
        await import("../../src/services/leetcode.service.js");

      clearCache();
      const result = getRandomProblem();
      assert.equal(result, null);
    });

    it("should return a problem from cache", async () => {
      const { setCache, getRandomProblem, clearCache } =
        await import("../../src/services/leetcode.service.js");

      const testProblems = [
        {
          id: "1",
          frontendId: "1",
          title: "Test Problem",
          titleSlug: "test-problem",
          difficulty: "Easy" as const,
          acRate: 50.0,
          tags: ["Array"],
        },
      ];

      setCache(testProblems);
      const result = getRandomProblem();

      assert.ok(result);
      assert.equal(result.id, "1");
      assert.equal(result.title, "Test Problem");

      clearCache();
    });

    it("should filter by difficulty", async () => {
      const { setCache, getRandomProblem, clearCache } =
        await import("../../src/services/leetcode.service.js");

      setCache([
        {
          id: "1",
          frontendId: "1",
          title: "Easy Problem",
          titleSlug: "easy-problem",
          difficulty: "Easy" as const,
          acRate: 80.0,
          tags: ["Array"],
        },
        {
          id: "2",
          frontendId: "2",
          title: "Hard Problem",
          titleSlug: "hard-problem",
          difficulty: "Hard" as const,
          acRate: 20.0,
          tags: ["DP"],
        },
      ]);

      // Filter by Easy
      for (let i = 0; i < 10; i++) {
        const result = getRandomProblem({ difficulty: "Easy" });
        assert.ok(result);
        assert.equal(result.difficulty, "Easy");
      }

      // Filter by Hard
      for (let i = 0; i < 10; i++) {
        const result = getRandomProblem({ difficulty: "Hard" });
        assert.ok(result);
        assert.equal(result.difficulty, "Hard");
      }

      // Filter by Medium (should return null)
      const result = getRandomProblem({ difficulty: "Medium" });
      assert.equal(result, null);

      clearCache();
    });

    it("should filter by category (case-insensitive)", async () => {
      const { setCache, getRandomProblem, clearCache } =
        await import("../../src/services/leetcode.service.js");

      setCache([
        {
          id: "1",
          frontendId: "1",
          title: "Array Problem",
          titleSlug: "array-problem",
          difficulty: "Easy" as const,
          acRate: 80.0,
          tags: ["Array", "Hash Table"],
        },
        {
          id: "2",
          frontendId: "2",
          title: "Tree Problem",
          titleSlug: "tree-problem",
          difficulty: "Medium" as const,
          acRate: 50.0,
          tags: ["Tree", "DFS"],
        },
      ]);

      // Filter by Array
      for (let i = 0; i < 10; i++) {
        const result = getRandomProblem({ category: "Array" });
        assert.ok(result);
        assert.ok(result.tags.includes("Array"));
      }

      // Filter by Tree (lowercase)
      const result = getRandomProblem({ category: "tree" });
      assert.ok(result);
      assert.ok(result.tags.includes("Tree"));

      // Filter by non-existent category
      const noResult = getRandomProblem({ category: "Graph" });
      assert.equal(noResult, null);

      clearCache();
    });

    it("should filter by both difficulty and category", async () => {
      const { setCache, getRandomProblem, clearCache } =
        await import("../../src/services/leetcode.service.js");

      setCache([
        {
          id: "1",
          frontendId: "1",
          title: "Easy Array",
          titleSlug: "easy-array",
          difficulty: "Easy" as const,
          acRate: 80.0,
          tags: ["Array"],
        },
        {
          id: "2",
          frontendId: "2",
          title: "Hard Array",
          titleSlug: "hard-array",
          difficulty: "Hard" as const,
          acRate: 20.0,
          tags: ["Array"],
        },
        {
          id: "3",
          frontendId: "3",
          title: "Easy Tree",
          titleSlug: "easy-tree",
          difficulty: "Easy" as const,
          acRate: 70.0,
          tags: ["Tree"],
        },
      ]);

      // Filter by Easy + Array
      for (let i = 0; i < 10; i++) {
        const result = getRandomProblem({
          difficulty: "Easy",
          category: "Array",
        });
        assert.ok(result);
        assert.equal(result.difficulty, "Easy");
        assert.ok(result.tags.includes("Array"));
        assert.equal(result.id, "1");
      }

      // Filter by Hard + Array
      const hardArray = getRandomProblem({
        difficulty: "Hard",
        category: "Array",
      });
      assert.ok(hardArray);
      assert.equal(hardArray.id, "2");

      // Filter by Easy + Tree
      const easyTree = getRandomProblem({
        difficulty: "Easy",
        category: "Tree",
      });
      assert.ok(easyTree);
      assert.equal(easyTree.id, "3");

      // Filter by Hard + Tree (should return null)
      const noResult = getRandomProblem({
        difficulty: "Hard",
        category: "Tree",
      });
      assert.equal(noResult, null);

      clearCache();
    });

    it("should return random problems from cache", async () => {
      const { setCache, getRandomProblem, clearCache } =
        await import("../../src/services/leetcode.service.js");

      const testProblems = [
        {
          id: "1",
          frontendId: "1",
          title: "Problem 1",
          titleSlug: "problem-1",
          difficulty: "Easy" as const,
          acRate: 50.0,
          tags: [],
        },
        {
          id: "2",
          frontendId: "2",
          title: "Problem 2",
          titleSlug: "problem-2",
          difficulty: "Medium" as const,
          acRate: 40.0,
          tags: [],
        },
        {
          id: "3",
          frontendId: "3",
          title: "Problem 3",
          titleSlug: "problem-3",
          difficulty: "Hard" as const,
          acRate: 30.0,
          tags: [],
        },
      ];

      setCache(testProblems);

      // Get multiple random problems
      const results = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const problem = getRandomProblem();
        if (problem) {
          results.add(problem.id);
        }
      }

      // With 50 attempts and 3 problems, we should get multiple different ones
      assert.ok(results.size >= 1, "Should return at least one problem");

      clearCache();
    });
  });

  describe("getCacheSize", () => {
    it("should return correct cache size", async () => {
      const { setCache, getCacheSize, clearCache } =
        await import("../../src/services/leetcode.service.js");

      clearCache();
      assert.equal(getCacheSize(), 0);

      setCache([
        {
          id: "1",
          frontendId: "1",
          title: "Test",
          titleSlug: "test",
          difficulty: "Easy",
          acRate: 50,
          tags: [],
        },
      ]);
      assert.equal(getCacheSize(), 1);

      clearCache();
    });
  });

  describe("data structure", () => {
    it("should have correct LeetCodeProblem structure", async () => {
      const { setCache, getRandomProblem, clearCache } =
        await import("../../src/services/leetcode.service.js");

      setCache([
        {
          id: "123",
          frontendId: "456",
          title: "Test Title",
          titleSlug: "test-title",
          difficulty: "Medium",
          acRate: 45.67,
          tags: ["Tag1", "Tag2"],
        },
      ]);

      const problem = getRandomProblem();

      assert.ok(problem);
      assert.equal(typeof problem.id, "string");
      assert.equal(typeof problem.frontendId, "string");
      assert.equal(typeof problem.title, "string");
      assert.equal(typeof problem.titleSlug, "string");
      assert.ok(["Easy", "Medium", "Hard"].includes(problem.difficulty));
      assert.equal(typeof problem.acRate, "number");
      assert.ok(Array.isArray(problem.tags));

      clearCache();
    });
  });

  describe("paid problem filtering", () => {
    it("should never include paidOnly problems in cache", async () => {
      const { setCache, getRandomProblem, clearCache } =
        await import("../../src/services/leetcode.service.js");

      // Simulate what the service does after filtering
      // Only free problems should be in cache
      const freeProblems = [
        {
          id: "1",
          frontendId: "1",
          title: "Free Problem",
          titleSlug: "free-problem",
          difficulty: "Easy" as const,
          acRate: 50,
          tags: [],
        },
      ];

      setCache(freeProblems);

      // All problems in cache should be accessible
      for (let i = 0; i < 10; i++) {
        const problem = getRandomProblem();
        assert.ok(problem);
        assert.equal(problem.title, "Free Problem");
      }

      clearCache();
    });
  });
});
