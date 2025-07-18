/**
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 * @license MIT
 * @copyright © 2025 Vo Quang Chien
 */

import { Collection } from 'discord.js';
import { DisTube } from 'distube';

export {};

declare module 'discord.js' {
  interface Client {
    commands: Collection<string, Command>;
    distube: DisTube;
  }
}
