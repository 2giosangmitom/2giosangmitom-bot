import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder
} from 'discord.js';

export interface Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

export interface CommandModule {
  default: Command;
}

export type CommandName = 'waifu' | 'leetcode';

export const COMMAND_MODULES: readonly CommandName[] = ['waifu', 'leetcode'] as const;
