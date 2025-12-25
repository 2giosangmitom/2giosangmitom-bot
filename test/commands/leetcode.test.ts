import { describe, it, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import type { LeetCodeProblem } from "../../src/services/leetcode.service.js";

type Interaction = {
  options: { getString: ReturnType<typeof mock.fn> };
  user: { tag: string };
  deferReply: ReturnType<typeof mock.fn>;
  editReply: ReturnType<typeof mock.fn>;
  followUp: ReturnType<typeof mock.fn>;
};

function buildInteraction(overrides: {
  difficulty: string | null;
  category: string | null;
}): Interaction {
  const getString = mock.fn((name: string) => {
    if (name === "difficulty") return overrides.difficulty;
    if (name === "category") return overrides.category;
    return null;
  });

  return {
    options: { getString },
    user: { tag: "tester#5678" },
    deferReply: mock.fn(async () => {}),
    editReply: mock.fn(async () => {}),
    followUp: mock.fn(async () => {}),
  };
}

function stubLogger() {
  return { info: () => {}, warn: () => {}, error: () => {} };
}

describe("LeetCodeCommand", () => {
  afterEach(() => {
    mock.restoreAll();
    mock.reset();
  });

  it("builds embeds for a hard problem and adds motivation image", async () => {
    const { setCache, clearCache } =
      await import("../../src/services/leetcode.service.js");
    const hardProblem: LeetCodeProblem = {
      id: "abc",
      frontendId: "123",
      title: "Sample Hard Problem",
      titleSlug: "sample-hard-problem",
      difficulty: "Hard",
      acRate: 42.5,
      tags: ["Tag1", "Tag2", "Tag3", "Tag4", "Tag5", "Tag6"],
    };
    setCache([hardProblem]);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(async (url: unknown) => {
      const u = String(url);
      if (u.startsWith("https://api.waifu.pics/sfw")) {
        return {
          ok: true,
          json: async () => ({ url: "https://example.com/waifu.png" }),
        } as Response;
      }
      throw new Error("Unexpected fetch call: " + u);
    }) as unknown as typeof fetch;

    const { LeetCodeCommand } =
      await import("../../src/commands/fun/leetcode.js");
    const interaction = buildInteraction({
      difficulty: "Hard",
      category: null,
    });
    const ctx = {
      container: { logger: stubLogger() },
    } as unknown as InstanceType<typeof LeetCodeCommand>;

    await LeetCodeCommand.prototype.chatInputRun.call(
      ctx,
      interaction as never,
    );

    const reply = interaction.editReply.mock.calls[0]?.arguments[0] as {
      embeds: Array<{ data: Record<string, unknown> }>;
    };
    assert.ok(reply);
    assert.ok(
      reply.embeds.length >= 2,
      "expects problem embed and motivation embed",
    );

    const problemEmbed = reply.embeds[0];
    assert.equal(problemEmbed.data.title, "🧠 LeetCode Random Problem");
    assert.ok(
      String(problemEmbed.data.description).includes(
        "[123] Sample Hard Problem",
      ),
    );
    assert.equal(
      problemEmbed.data.url,
      "https://leetcode.com/problems/sample-hard-problem",
    );
    assert.equal(problemEmbed.data.color, 0xff375f);

    const tagsField = (problemEmbed.data.fields as Array<{ value: string }>)[0];
    assert.ok(tagsField.value.endsWith("..."));

    const motivationEmbed = reply.embeds[1];
    assert.equal(
      motivationEmbed.data.title,
      "💪 Hard Problem? Here's some motivation!",
    );
    const motivationImage = motivationEmbed.data.image as { url: string };
    assert.equal(motivationImage.url, "https://example.com/waifu.png");

    clearCache();
    globalThis.fetch = originalFetch;
  });

  it("reports failure when refresh cannot fetch problems", async () => {
    const { clearCache } =
      await import("../../src/services/leetcode.service.js");
    clearCache();

    const sapphire = await import("@sapphire/framework");
    sapphire.container.logger =
      stubLogger() as unknown as typeof sapphire.container.logger;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => "Internal Error",
    })) as unknown as typeof fetch;

    const { LeetCodeCommand } =
      await import("../../src/commands/fun/leetcode.js");
    const interaction = buildInteraction({ difficulty: null, category: null });
    const ctx = {
      container: { logger: stubLogger() },
    } as unknown as InstanceType<typeof LeetCodeCommand>;

    await LeetCodeCommand.prototype.chatInputRun.call(
      ctx,
      interaction as never,
    );

    const reply = interaction.editReply.mock.calls[0]?.arguments[0] as {
      content: string;
    };
    assert.ok(reply);
    assert.equal(
      reply.content,
      "❌ Failed to fetch LeetCode problems: LeetCode API error: 500",
    );

    globalThis.fetch = originalFetch;
  });
});
