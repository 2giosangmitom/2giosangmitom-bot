import { randomFrom } from '../lib/utils.js';

/**
 * @typedef {Object} Trigger
 * @property {RegExp} pattern - The regex pattern to match normalized message content
 * @property {string[]} responses - A list of possible replies
 */

/** @type {Trigger[]} */
const triggers = [
  {
    pattern: /\b(vl|vcl|dcm|dm)\b/i,
    responses: ['Chui tuc con cark 🚫']
  },
  {
    pattern: /\b(hello|hi|chao|yo)\b|xin chao/i,
    responses: ['Chao ban 👋', 'Hi hi 😄', 'Toi nghe day!', 'Hello hello!']
  },
  {
    pattern: /cho tao xem meme/i,
    responses: ['Meme con cark', 'Xem meme lam j', 'Xem cuc cut']
  }
];

/**
 * Normalize Vietnamese: remove diacritics and convert to lowercase
 * Example: "Đây là tiếng Việt!" -> "day la tieng viet!"
 * @param {string} str - The string that needs to be normalized
 * @returns {string} - The normalized string
 * @throws {TypeError} When input is not a string
 */
function normalize(str) {
  if (typeof str !== 'string') {
    throw new TypeError('Input must be a string');
  }

  return str
    .normalize('NFD') // Decompose letters and accents
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritic marks
    .replace(/đ/g, 'd') // Convert đ to d
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/**
 * Automatically generates a response based on message content
 * @param {string} rawContent - Raw message content from Discord
 * @returns {string | null} A bot response, or null if no trigger matches
 * @throws {TypeError} When input is not a string
 */
function response(rawContent) {
  if (typeof rawContent !== 'string') {
    return null;
  }

  try {
    const content = normalize(rawContent);

    for (const trigger of triggers) {
      if (trigger.pattern.test(content)) {
        try {
          const responseText = randomFrom(trigger.responses);
          return responseText || null;
        } catch (error) {
          // If randomFrom throws, continue to next trigger
          console.error('Error selecting random response:', error);
          continue;
        }
      }
    }

    return null;
  } catch (error) {
    // Log error but don't throw to avoid breaking the bot
    console.error('Error in auto-response:', error);
    return null;
  }
}

export { response, normalize };
