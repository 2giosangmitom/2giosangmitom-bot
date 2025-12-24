import { describe, it, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  WaifuService,
  validateCategory,
  getAllowedCategories,
} from "../../src/services/waifu.service.js";

describe("WaifuService", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("validateCategory", () => {
    it("should return default category for null input", () => {
      const result = validateCategory(null);
      assert.equal(result, "waifu");
    });

    it("should return default category for undefined input", () => {
      const result = validateCategory(undefined);
      assert.equal(result, "waifu");
    });

    it("should return default category for empty string", () => {
      const result = validateCategory("");
      assert.equal(result, "waifu");
    });

    it("should return valid category when provided", () => {
      assert.equal(validateCategory("neko"), "neko");
      assert.equal(validateCategory("hug"), "hug");
      assert.equal(validateCategory("smile"), "smile");
    });

    it("should handle case-insensitive input", () => {
      assert.equal(validateCategory("NEKO"), "neko");
      assert.equal(validateCategory("Hug"), "hug");
    });

    it("should return default for invalid category", () => {
      assert.equal(validateCategory("invalid"), "waifu");
      assert.equal(validateCategory("random"), "waifu");
    });

    it("should never allow NSFW categories", () => {
      // These are NSFW categories that must never be allowed
      const nsfwCategories = ["nsfw", "ero", "waifu.nsfw", "neko.nsfw"];

      for (const nsfw of nsfwCategories) {
        const result = validateCategory(nsfw);
        assert.equal(
          result,
          "waifu",
          `NSFW category "${nsfw}" should fallback to default`,
        );
      }
    });
  });

  describe("getAllowedCategories", () => {
    it("should return array of allowed categories", () => {
      const categories = getAllowedCategories();

      assert.ok(Array.isArray(categories));
      assert.ok(categories.length > 0);
    });

    it("should include expected SFW categories", () => {
      const categories = getAllowedCategories();

      assert.ok(categories.includes("waifu"));
      assert.ok(categories.includes("neko"));
      assert.ok(categories.includes("hug"));
      assert.ok(categories.includes("smile"));
    });

    it("should NOT include any NSFW categories", () => {
      const categories = getAllowedCategories();

      // Ensure no NSFW-related strings
      for (const cat of categories) {
        assert.ok(
          !cat.includes("nsfw"),
          `Category should not contain nsfw: ${cat}`,
        );
        assert.ok(
          !cat.includes("ero"),
          `Category should not contain ero: ${cat}`,
        );
      }
    });
  });

  describe("fetchImage", () => {
    it("should return image URL and category", async () => {
      const mockImageUrl = "https://i.waifu.pics/test-image.jpg";

      globalThis.fetch = mock.fn(async () => ({
        ok: true,
        json: async () => ({ url: mockImageUrl }),
      })) as unknown as typeof fetch;

      const service = new WaifuService();
      const result = await service.fetchImage("neko");

      assert.equal(result.category, "neko");
      assert.equal(result.imageUrl, mockImageUrl);
    });

    it("should use default category when none provided", async () => {
      let capturedUrl: string | undefined;

      globalThis.fetch = mock.fn(async (url: unknown) => {
        capturedUrl = url as string;
        return {
          ok: true,
          json: async () => ({ url: "https://i.waifu.pics/test.jpg" }),
        };
      }) as unknown as typeof fetch;

      const service = new WaifuService();
      await service.fetchImage();

      assert.ok(capturedUrl?.includes("/sfw/waifu"));
    });

    it("should always use /sfw/ endpoint", async () => {
      let capturedUrl: string | undefined;

      globalThis.fetch = mock.fn(async (url: unknown) => {
        capturedUrl = url as string;
        return {
          ok: true,
          json: async () => ({ url: "https://i.waifu.pics/test.jpg" }),
        };
      }) as unknown as typeof fetch;

      const service = new WaifuService();
      await service.fetchImage("neko");

      assert.ok(capturedUrl?.startsWith("https://api.waifu.pics/sfw/"));
      assert.ok(
        !capturedUrl?.includes("/nsfw/"),
        "URL must never contain /nsfw/",
      );
    });

    it("should fallback invalid category and still use /sfw/", async () => {
      let capturedUrl: string | undefined;

      globalThis.fetch = mock.fn(async (url: unknown) => {
        capturedUrl = url as string;
        return {
          ok: true,
          json: async () => ({ url: "https://i.waifu.pics/test.jpg" }),
        };
      }) as unknown as typeof fetch;

      const service = new WaifuService();
      const result = await service.fetchImage("nsfw-attempt");

      // Should fallback to default and use /sfw/
      assert.equal(result.category, "waifu");
      assert.ok(capturedUrl?.includes("/sfw/waifu"));
      assert.ok(!capturedUrl?.includes("nsfw"));
    });

    it("should throw error on API failure", async () => {
      globalThis.fetch = mock.fn(async () => ({
        ok: false,
        status: 500,
      })) as unknown as typeof fetch;

      const service = new WaifuService();

      await assert.rejects(service.fetchImage(), {
        message: "Waifu API error: 500",
      });
    });
  });
});
