import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { WaifuCommand } from "../../src/commands/fun/waifu.js";
import {
  validateCategory,
  getAllowedCategories,
} from "../../src/services/waifu.service.js";

type Interaction = {
  options: { getString: ReturnType<typeof mock.fn> };
  user: { tag: string };
  deferReply: ReturnType<typeof mock.fn>;
  editReply: ReturnType<typeof mock.fn>;
};

function buildInteraction(category: string | null): Interaction {
  const getString = mock.fn(() => category);
  return {
    options: { getString },
    user: { tag: "tester#9999" },
    deferReply: mock.fn(async () => {}),
    editReply: mock.fn(async () => {}),
  };
}

function stubCommand(fetchImage: () => Promise<unknown>) {
  return {
    waifuService: { fetchImage },
    container: { logger: { info: () => {}, error: () => {} } },
  } as unknown as WaifuCommand & {
    waifuService: { fetchImage: typeof fetchImage };
  };
}

describe("WaifuCommand", () => {
  it("validates categories and rejects NSFW", () => {
    const allowed = getAllowedCategories();
    for (const cat of allowed) {
      assert.equal(validateCategory(cat), cat);
    }

    const fallbackCases = ["", "invalid", "nsfw", "ero", "random"];
    for (const cat of fallbackCases) {
      assert.equal(validateCategory(cat), "waifu");
    }
  });

  it("builds a waifu embed on success", async () => {
    const fetchImage = mock.fn(async () => ({
      category: "hug",
      imageUrl: "https://example.com/waifu.png",
    }));

    const interaction = buildInteraction(null);
    const ctx = stubCommand(fetchImage);

    await WaifuCommand.prototype.chatInputRun.call(ctx, interaction as never);

    const reply = interaction.editReply.mock.calls[0]?.arguments[0] as {
      embeds: Array<{ data: Record<string, unknown> }>;
    };
    assert.ok(reply);
    const embed = reply.embeds[0];
    assert.equal(embed.data.title, "🎨 Random Waifu");
    assert.ok(String(embed.data.description).includes("hug"));
    assert.equal(
      (embed.data.image as { url: string }).url,
      "https://example.com/waifu.png",
    );
  });

  it("returns a friendly error on fetch failure", async () => {
    const fetchImage = mock.fn(async () => {
      throw new Error("service down");
    });

    const interaction = buildInteraction("waifu");
    const ctx = stubCommand(fetchImage);

    await WaifuCommand.prototype.chatInputRun.call(ctx, interaction as never);

    const reply = interaction.editReply.mock.calls[0]?.arguments[0] as {
      content: string;
    };
    assert.ok(reply);
    assert.equal(reply.content, "❌ Failed to fetch image: service down");
  });
});
