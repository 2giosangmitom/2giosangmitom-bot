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

  interface Problem {
    id: number;
    title: string;
    difficulty: string;
    isPaid: boolean;
    acRate: number;
    url: string;
    topics: string[];
  }

  interface LeetCodeData {
    metadata: {
      totalProblems: number;
      lastUpdate: string;
    };
    topics: string[];
    problems: Problem[];
  }

  interface LeetCodeResponse {
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

  interface Trigger {
    description: string; // Description for the trigger
    pattern: RegExp; // RegExp to check the message content
    responses: string[]; // Response messages
  }
}
