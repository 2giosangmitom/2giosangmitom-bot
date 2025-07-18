/**
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 * @license MIT
 * @copyright © 2025 Vo Quang Chien
 */

import type { Interaction, CacheType, SlashCommandBuilder } from 'discord.js';

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
}
