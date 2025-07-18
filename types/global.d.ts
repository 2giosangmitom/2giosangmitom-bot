import type { Interaction, CacheType, SlashCommandBuilder } from 'discord.js';
import { vi } from 'vitest';

export {};

declare global {
  interface Command {
    data: SlashCommandBuilder;
    execute(interaction: Interaction<CacheType>): Promise<void>;
    autocomplete?(interaction: Interaction<CacheType>): Promise<void>;
  }

  interface WaifuPicsResponse {
    url: string;
  }

  interface MockChatInteraction {
    reply: ReturnType<typeof vi.fn>;
    fetchReply: ReturnType<typeof vi.fn>;
    client: {
      ws: {
        ping: number;
      };
    };
    editReply: ReturnType<typeof vi.fn>;
    createdTimestamp: number;
    deferReply: ReturnType<typeof vi.fn>;
    options: {
      getString: ReturnType<typeof vi.fn>;
    };
  }
}
