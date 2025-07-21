/**
 * @file Export reuseable types
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 */

import type {
  ClientEvents,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  SlashCommandOptionsOnlyBuilder,
  AutocompleteInteraction
} from 'discord.js';
import { vi } from 'vitest';

// Discord.js client event
export interface ClientEvent<K extends keyof ClientEvents> {
  name: K;
  once?: boolean;
  execute: (...args: ClientEvents[K]) => void | Promise<void>;
}

// Slash command
export interface SlashCommand {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
  autocomplete?(interaction: AutocompleteInteraction): Promise<void>;
}

// JSON structure of waifu.pics API response
export interface WaifuPicsResponse {
  url: string;
}

export type MockChatInteraction = ReturnType<typeof vi.mockObject<ChatInputCommandInteraction>>;
export type MockAutoCompleteInteraction = ReturnType<typeof vi.mockObject<AutocompleteInteraction>>;

export interface Problem {
  id: number;
  title: string;
  difficulty: string;
  isPaid: boolean;
  acRate: number;
  url: string;
  topics: string[];
}

export interface LeetCodeData {
  metadata: {
    totalProblems: number;
    lastUpdate: string;
  };
  topics: string[];
  problems: Problem[];
}

export interface LeetCodeResponse {
  data?: {
    problemsetQuestionListV2?: {
      questions?: {
        id: number;
        titleSlug: string;
        title: string;
        questionFrontendId: number;
        paidOnly: boolean;
        difficulty: string;
        topicTags: {
          name: string;
          slug: string;
        }[];
        acRate: number;
      }[];
      totalLength?: number;
    };
  };
}
