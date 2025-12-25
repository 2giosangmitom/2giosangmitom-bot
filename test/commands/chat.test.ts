import { describe, it, mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import { ChatCommand } from "../../src/commands/ai/chat.js";

type Interaction = {
  options: { getString: ReturnType<typeof mock.fn> };
  user: { tag: string };
  deferReply: ReturnType<typeof mock.fn>;
  editReply: ReturnType<typeof mock.fn>;
  followUp: ReturnType<typeof mock.fn>;
};

function buildInteraction(prompt: string, model?: string): Interaction {
  const getString = mock.fn((name: string) => {
    if (name === "prompt") return prompt;
    if (name === "model") return model ?? null;
    return null;
  });

  return {
    options: { getString },
    user: { tag: "tester#1234" },
    deferReply: mock.fn(async () => {}),
    editReply: mock.fn(async () => {}),
    followUp: mock.fn(async () => {}),
  };
}

function buildContext(ollamaService: {
  chat: (...args: unknown[]) => Promise<unknown>;
}) {
  return {
    ollamaService,
    container: { logger: { info: () => {}, error: () => {} } },
  } as unknown as ChatCommand & {
    ollamaService: typeof ollamaService;
  };
}

describe("ChatCommand", () => {
  afterEach(() => {
    mock.restoreAll();
    mock.reset();
  });

  it("sends first chunk then follow-ups", async () => {
    const interaction = buildInteraction("hello world");
    const ollamaResponse = {
      content: "A".repeat(2100),
      model: "llama3.2:3b",
      elapsedMs: 42,
    };

    const ollamaService = {
      chat: mock.fn(async () => ollamaResponse),
    };

    const ctx = buildContext(ollamaService);
    await ChatCommand.prototype.chatInputRun.call(ctx, interaction as never);

    const firstCall = ollamaService.chat.mock.calls[0];
    assert.ok(firstCall, "chat should be called once");
    assert.equal(firstCall.arguments.at(0), "hello world");
    assert.equal(firstCall.arguments.at(1), "llama3.2:3b");

    assert.equal(interaction.deferReply.mock.calls.length, 1);
    assert.equal(interaction.editReply.mock.calls.length, 1);
    assert.equal(interaction.followUp.mock.calls.length, 1);

    const firstChunk = interaction.editReply.mock.calls[0]
      ?.arguments[0] as string;
    const secondChunk = interaction.followUp.mock.calls[0]
      ?.arguments[0] as string;

    assert.ok(firstChunk.length <= 2000);
    assert.equal(
      firstChunk.length + secondChunk.length,
      ollamaResponse.content.length,
    );
  });

  it("returns a friendly error when Ollama fails", async () => {
    const interaction = buildInteraction("bad prompt");
    const ollamaService = {
      chat: mock.fn(async () => {
        throw new Error("API offline");
      }),
    };

    const ctx = buildContext(ollamaService);
    await ChatCommand.prototype.chatInputRun.call(ctx, interaction as never);

    const errorPayload = interaction.editReply.mock.calls[0]?.arguments[0] as {
      content: string;
    };
    assert.ok(errorPayload);
    assert.equal(
      errorPayload.content,
      "❌ Failed to get AI response: API offline",
    );
    assert.equal(interaction.followUp.mock.calls.length, 0);
  });
});
