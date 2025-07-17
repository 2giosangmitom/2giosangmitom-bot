import type { Interaction, CacheType, SlashCommandBuilder } from 'discord.js';

export {};

declare global {
  interface Command {
    data: SlashCommandBuilder;
    execute(interaction: Interaction<CacheType>): Promise<void>;
    autocomplete?(interaction: Interaction<CacheType>): Promise<void>;
  }
}
