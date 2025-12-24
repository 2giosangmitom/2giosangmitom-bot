import { describe, it, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

// Mock logger for testing
const mockLogger = {
  debug: mock.fn(),
};

// We need to test the service logic in isolation
describe("OllamaService", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("chat", () => {
    it("should return response with content, model, and elapsed time", async () => {
      const mockResponse = {
        model: "llama3.2",
        message: {
          role: "assistant",
          content: "Hello! How can I help you?",
        },
        done: true,
      };

      globalThis.fetch = mock.fn(async () => ({
        ok: true,
        json: async () => mockResponse,
        text: async () => JSON.stringify(mockResponse),
      })) as unknown as typeof fetch;

      // Import dynamically to use mocked fetch
      const { OllamaService } =
        await import("../../src/services/ollama.service.js");

      const service = new OllamaService({
        baseUrl: "http://localhost:11434",
        logger: mockLogger,
      });

      const result = await service.chat("Hello");

      assert.equal(result.content, "Hello! How can I help you?");
      assert.equal(result.model, "llama3.2");
      assert.equal(typeof result.elapsedMs, "number");
      assert.ok(result.elapsedMs >= 0, "Elapsed time should be non-negative");
    });

    it("should use custom model when provided", async () => {
      const mockResponse = {
        model: "mistral",
        message: {
          role: "assistant",
          content: "Response from Mistral",
        },
        done: true,
      };

      let capturedBody: string | undefined;

      globalThis.fetch = mock.fn(async (_url: unknown, options: unknown) => {
        capturedBody = (options as { body: string }).body;
        return {
          ok: true,
          json: async () => mockResponse,
          text: async () => JSON.stringify(mockResponse),
        };
      }) as unknown as typeof fetch;

      const { OllamaService } =
        await import("../../src/services/ollama.service.js");

      const service = new OllamaService({
        baseUrl: "http://localhost:11434",
        logger: mockLogger,
      });

      await service.chat("Hello", "mistral");

      assert.ok(capturedBody);
      const parsedBody = JSON.parse(capturedBody);
      assert.equal(parsedBody.model, "mistral");
    });

    it("should throw error on API failure", async () => {
      globalThis.fetch = mock.fn(async () => ({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      })) as unknown as typeof fetch;

      const { OllamaService } =
        await import("../../src/services/ollama.service.js");

      const service = new OllamaService({
        baseUrl: "http://localhost:11434",
        logger: mockLogger,
      });

      await assert.rejects(service.chat("Hello"), {
        message: "Ollama API error: 500 - Internal Server Error",
      });
    });

    it("should send correct request format", async () => {
      let capturedUrl: string | undefined;
      let capturedOptions: RequestInit | undefined;

      globalThis.fetch = mock.fn(async (url: unknown, options: unknown) => {
        capturedUrl = url as string;
        capturedOptions = options as RequestInit;
        return {
          ok: true,
          json: async () => ({
            model: "llama3.2",
            message: { role: "assistant", content: "Test" },
            done: true,
          }),
        };
      }) as unknown as typeof fetch;

      const { OllamaService } =
        await import("../../src/services/ollama.service.js");

      const service = new OllamaService({
        baseUrl: "http://localhost:11434/",
        logger: mockLogger,
      });

      await service.chat("Test prompt");

      assert.equal(capturedUrl, "http://localhost:11434/api/chat");
      assert.equal(capturedOptions?.method, "POST");
      assert.ok(capturedOptions?.headers);

      const body = JSON.parse(capturedOptions?.body as string);
      assert.equal(body.stream, false);
      assert.equal(body.messages[0].role, "user");
      assert.equal(body.messages[0].content, "Test prompt");
    });
  });
});
