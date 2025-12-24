import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  initializeCategoryFuse,
  searchCategories,
  getAllCategories,
  clearCategoryFuse,
} from "../../src/utils/leetcode-category-fuse.js";

describe("leetcode-category-fuse", () => {
  const testCategories = [
    "Array",
    "Hash Table",
    "Linked List",
    "Math",
    "Two Pointers",
    "Binary Search",
    "Dynamic Programming",
    "Backtracking",
    "Stack",
    "Heap",
    "Greedy",
    "Sort",
    "Bit Manipulation",
    "Tree",
    "Depth-First Search",
    "Breadth-First Search",
    "Union Find",
    "Graph",
    "Design",
    "Topological Sort",
    "Trie",
    "Binary Indexed Tree",
    "Segment Tree",
    "Recursion",
    "Brainteaser",
  ];

  beforeEach(() => {
    clearCategoryFuse();
  });

  describe("initializeCategoryFuse", () => {
    it("should initialize Fuse with categories", () => {
      initializeCategoryFuse(testCategories);
      const all = getAllCategories();
      assert.equal(all.length, testCategories.length);
    });

    it("should sort categories alphabetically", () => {
      initializeCategoryFuse(["Zebra", "Apple", "Mango"]);
      const all = getAllCategories();
      assert.deepEqual(all, ["Apple", "Mango", "Zebra"]);
    });
  });

  describe("searchCategories", () => {
    it("should return empty array when not initialized", () => {
      const results = searchCategories("array");
      assert.deepEqual(results, []);
    });

    it("should return first 25 categories when query is empty", () => {
      initializeCategoryFuse(testCategories);
      const results = searchCategories("");
      assert.equal(results.length, 25);
    });

    it("should return all categories if less than 25 with empty query", () => {
      initializeCategoryFuse(["Array", "Tree", "Graph"]);
      const results = searchCategories("");
      assert.equal(results.length, 3);
    });

    it("should find exact matches", () => {
      initializeCategoryFuse(testCategories);
      const results = searchCategories("Array");
      assert.ok(results.includes("Array"));
    });

    it("should find fuzzy matches", () => {
      initializeCategoryFuse(testCategories);
      const results = searchCategories("arr");
      assert.ok(results.includes("Array"));
    });

    it("should find partial matches", () => {
      initializeCategoryFuse(testCategories);
      const results = searchCategories("Dynam");
      // Should find "Dynamic Programming" via partial match
      assert.ok(results.includes("Dynamic Programming"));
    });

    it("should find multi-word categories", () => {
      initializeCategoryFuse(testCategories);
      const results = searchCategories("dynamic");
      assert.ok(results.includes("Dynamic Programming"));
    });

    it("should find categories case-insensitively", () => {
      initializeCategoryFuse(testCategories);
      const results = searchCategories("TREE");
      assert.ok(results.includes("Tree"));
    });

    it("should limit results to 25", () => {
      // Create 50 categories
      const manyCategories = Array.from(
        { length: 50 },
        (_, i) => `Category${i}`,
      );
      initializeCategoryFuse(manyCategories);
      const results = searchCategories("Category");
      assert.ok(results.length <= 25);
    });
  });

  describe("getAllCategories", () => {
    it("should return empty array when not initialized", () => {
      const all = getAllCategories();
      assert.deepEqual(all, []);
    });

    it("should return all categories after initialization", () => {
      initializeCategoryFuse(testCategories);
      const all = getAllCategories();
      assert.equal(all.length, testCategories.length);
    });

    it("should return a copy of the categories", () => {
      initializeCategoryFuse(["A", "B", "C"]);
      const all = getAllCategories();
      all.push("D");
      const allAgain = getAllCategories();
      assert.equal(allAgain.length, 3);
    });
  });

  describe("clearCategoryFuse", () => {
    it("should clear the Fuse instance", () => {
      initializeCategoryFuse(testCategories);
      assert.ok(getAllCategories().length > 0);

      clearCategoryFuse();

      assert.deepEqual(getAllCategories(), []);
      assert.deepEqual(searchCategories("array"), []);
    });
  });
});
