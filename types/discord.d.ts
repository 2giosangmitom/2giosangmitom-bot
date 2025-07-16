import { Collection, SlashCommandBuilder } from 'discord.js';

export {};

declare module 'discord.js' {
  interface Command {
    data: SlashCommandBuilder;
    execute(interaction: Interaction<CacheType>): Promise<void>;
  }

  interface Client {
    commands: Collection<string, Command>;
  }
}
