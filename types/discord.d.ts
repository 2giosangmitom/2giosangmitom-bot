/**
 * @file Extend built-in discord.js types
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 */

import { Collection } from 'discord.js';
import type { SlashCommand } from '.';
import pino from 'pino';
import type LeetCodeService from '~/services/leetcode';
import type MusicService from '~/services/music';

export {};

declare module 'discord.js' {
  interface Client {
    commands: Collection<string, SlashCommand>;
    log: ReturnType<typeof pino>;
    leetcode: LeetCodeService;
    music: MusicService;
  }
}
