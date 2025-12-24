import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  splitMessage,
  DISCORD_MESSAGE_LIMIT,
} from "../../src/utils/message.js";

describe("message utilities", () => {
  describe("DISCORD_MESSAGE_LIMIT", () => {
    it("should be 2000", () => {
      assert.equal(DISCORD_MESSAGE_LIMIT, 2000);
    });
  });

  describe("splitMessage", () => {
    it("should return single chunk for short messages", () => {
      const message = "Hello, world!";
      const chunks = splitMessage(message);

      assert.equal(chunks.length, 1);
      assert.equal(chunks[0], message);
    });

    it("should return single chunk for message exactly at limit", () => {
      const message = "A".repeat(2000);
      const chunks = splitMessage(message);

      assert.equal(chunks.length, 1);
      assert.equal(chunks[0], message);
    });

    it("should split message exceeding limit", () => {
      const message = "A".repeat(2500);
      const chunks = splitMessage(message);

      assert.ok(chunks.length > 1, "Should have multiple chunks");
      chunks.forEach((chunk) => {
        assert.ok(
          chunk.length <= DISCORD_MESSAGE_LIMIT,
          "Each chunk should be within limit",
        );
      });
    });

    it("should split at newlines when possible", () => {
      const line = "A".repeat(100);
      const message = `${line}\n${line}\n${line}`;
      const chunks = splitMessage(message, 150);

      // Each line is 100 chars, with newlines total is 302
      // With limit 150, first chunk gets first line (100), second gets second line, third gets third
      assert.ok(chunks.length >= 2, "Should have multiple chunks");
      assert.ok(chunks[0]!.length <= 150, "First chunk should be within limit");
    });

    it("should split at spaces when no newline available", () => {
      const message = "word ".repeat(50);
      const chunks = splitMessage(message, 100);

      assert.ok(chunks.length > 1);
      chunks.forEach((chunk) => {
        assert.ok(chunk.length <= 100, "Each chunk should be within limit");
      });
    });

    it("should force split when no good break point", () => {
      const message = "A".repeat(300);
      const chunks = splitMessage(message, 100);

      assert.equal(chunks.length, 3);
      assert.equal(chunks[0]!.length, 100);
      assert.equal(chunks[1]!.length, 100);
      assert.equal(chunks[2]!.length, 100);
    });

    it("should handle custom maxLength", () => {
      const message = "A".repeat(500);
      const chunks = splitMessage(message, 100);

      assert.equal(chunks.length, 5);
    });

    it("should trim leading whitespace from subsequent chunks", () => {
      const message = "Hello World Test";
      const chunks = splitMessage(message, 7);

      // Should not have leading spaces on chunks after split
      chunks.forEach((chunk) => {
        assert.ok(!chunk.startsWith(" "), "Chunks should not start with space");
      });
    });

    it("should handle empty string", () => {
      const chunks = splitMessage("");
      assert.equal(chunks.length, 1);
      assert.equal(chunks[0], "");
    });

    it("should preserve content integrity", () => {
      const message = "The quick brown fox jumps over the lazy dog.";
      const chunks = splitMessage(message, 20);

      const rejoined = chunks.join(" ");
      // Content should be preserved (possibly with different spacing)
      assert.ok(rejoined.includes("quick"));
      assert.ok(rejoined.includes("brown"));
      assert.ok(rejoined.includes("fox"));
    });
  });
});
