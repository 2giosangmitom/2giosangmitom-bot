/**
 * @file Export functions to work with waifu.pics API
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 */

import { randomFrom } from '~/lib/utils';
import type { WaifuPicsResponse } from '~/types';

// Allowed categories from waifu.pics
const categories = ['waifu', 'hug', 'kiss', 'happy', 'handhold', 'bite', 'slap'];

// Titles for the embed message
const titles = [
  "Here's Your Daily Dose of Motivation ✨",
  'A Waifu Appears! 💖',
  'Stay Strong, Senpai! 💪',
  "You Got This! Here's Some Motivation 🔥",
  'Summoning Your Waifu... 💫',
  'Your Waifu Believes in You! 🌸',
  'Power Up Time! 🚀',
  "Don't Give Up, Senpai! 💥",
  'Waifu Buff Activated! ⚡',
  "Keep Going, You're Doing Great! 🌟",
  'One Step Closer to Victory! 🏆',
  'Level Up Your Spirit! 🆙',
  'Another Day, Another Quest! 🗺️',
  "You're Stronger Than You Think! 🐉",
  "Waifu's Blessing Incoming! 🍀",
  "Even Mondays Can't Stop You! ☕",
  'Waifu Says: Believe in Yourself! 🦸',
  'You Leveled Up in Awesomeness! 🎮',
  'No Boss Fight Can Beat You! 🗡️',
  'Waifu Cheering From the Sidelines! 📣',
  'Critical Hit of Positivity! 💥',
  'Your Effort is Super Effective! 🧩',
  'Waifu Sent You Extra Luck Today! 🍀',
  'Keep Grinding, Hero! 💎',
  "You're the Main Character Today! 🎬",
  "Waifu's Power-Up: Unlimited Motivation! 🔋",
  'Achievement Unlocked: Keep Going! 🏅',
  "Waifu's Smile Restores 100 HP! 💚",
  'Plot Armor Activated! 🛡️',
  "You're Destined for Greatness! 🌠"
];

function validateResponse(json: unknown): json is WaifuPicsResponse {
  if (!json) {
    return false;
  }

  if (typeof json === 'object' && 'url' in json && typeof json.url !== 'string') {
    return false;
  }
  return true;
}

/**
 * @description Get random image from waifu.pics
 * @param category The category of the image
 * @returns The image url with its title and random title.
 */
async function getImage(
  category?: string
): Promise<{ url: string; category: string; title: string }> {
  const finalCategory = category ?? randomFrom(categories)!;

  // Reject if the provided category is not valid
  if (!categories.includes(finalCategory)) {
    throw new Error(`The ${finalCategory} category is not valid`);
  }

  // Fetch the image
  const res = await fetch(`https://api.waifu.pics/sfw/${finalCategory}`);

  if (!res.ok) {
    throw new Error(
      `The waifu.pics API is not available at the moment. Status code: ${res.status}`
    );
  }

  const json = await res.json();
  if (!validateResponse(json)) {
    throw new Error('The responsed JSON from waifu.pics is not valid');
  }

  return { url: json.url, category: finalCategory, title: randomFrom(titles)! };
}

export { categories, titles, getImage };
