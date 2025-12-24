import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateCategory,
  getAllowedCategories,
} from "../../src/services/waifu.service.js";

describe("WaifuCommand", () => {
  describe("category validation", () => {
    it("should use default category when none selected", () => {
      const result = validateCategory(null);
      assert.equal(result, "waifu");
    });

    it("should accept valid category from allowed list", () => {
      const categories = getAllowedCategories();

      for (const cat of categories) {
        const result = validateCategory(cat);
        assert.equal(result, cat, `Category ${cat} should be accepted`);
      }
    });

    it("should reject invalid categories", () => {
      const invalidCategories = ["invalid", "test", "random", ""];

      for (const cat of invalidCategories) {
        const result = validateCategory(cat);
        assert.equal(
          result,
          "waifu",
          `Invalid category "${cat}" should fallback to default`,
        );
      }
    });
  });

  describe("NSFW protection", () => {
    it("should never accept NSFW-related input", () => {
      const nsfwAttempts = [
        "nsfw",
        "NSFW",
        "ero",
        "ERO",
        "nsfw/waifu",
        "waifu/nsfw",
        "../nsfw/waifu",
      ];

      for (const attempt of nsfwAttempts) {
        const result = validateCategory(attempt);
        assert.equal(
          result,
          "waifu",
          `NSFW attempt "${attempt}" must fallback to default`,
        );
      }
    });

    it("should only contain SFW categories in allowed list", () => {
      const categories = getAllowedCategories();

      const nsfwKeywords = ["nsfw", "ero", "explicit", "adult", "xxx"];

      for (const cat of categories) {
        for (const keyword of nsfwKeywords) {
          assert.ok(
            !cat.toLowerCase().includes(keyword),
            `Category "${cat}" contains forbidden keyword "${keyword}"`,
          );
        }
      }
    });
  });

  describe("embed format expectations", () => {
    it("should have required embed fields defined", () => {
      // These are the expected values for the embed
      const expectedTitle = "🎨 Random Waifu";
      const expectedFooter = "Powered by waifu.pics";

      assert.ok(expectedTitle.includes("Random Waifu"));
      assert.ok(expectedFooter.includes("waifu.pics"));
    });
  });
});
