/**
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 * @license MIT
 * @copyright © 2025 Vo Quang Chien
 */

import { randomFrom } from '~/lib/utils';

interface Trigger {
  description: string; // Description for the trigger
  pattern: RegExp; // RegExp to check the message content
  responses: string[]; // Response messages
}

/** @description Regexes for checking whether the bot should reply to the user */
const triggers: Trigger[] = [
  {
    description: 'Greeting',
    pattern: /\b(hello|hi|chao|yo)\b|xin chao/i,
    responses: ['Chao ban 👋', 'Hi hi 😄', 'Toi nghe day!', 'Hello hello!']
  }
];

/**
 * @description Get normalized string, remove diacritics and convert to lowercase.
 * @param str The string to normalize
 */
function normalize(str: string) {
  return str
    .normalize('NFD') // Decompose letters and accents
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritic marks
    .replace(/đ/gi, 'd') // Convert đ to d
    .toLowerCase();
}

/**
 * @description Automatically generates a response based on message content.
 * @param content Message content from Discord
 */
function replyMessage(content: string): string | null {
  content = normalize(content);

  for (const trigger of triggers) {
    if (trigger.pattern.test(content)) {
      return randomFrom(trigger.responses);
    }
  }

  return null;
}

export { triggers, replyMessage, normalize };
