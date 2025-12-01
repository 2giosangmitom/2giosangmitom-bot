import { randomFrom } from '../lib/utils';
import { z } from 'zod';
import { createLogger } from '../lib/logger';
import { ExternalServiceError, ValidationError } from '../lib/errors';

const logger = createLogger('WaifuService');

// Allowed categories from waifu.pics
export const categories = ['waifu', 'hug', 'kiss', 'happy', 'handhold', 'bite', 'slap'] as const;

export type WaifuCategory = (typeof categories)[number];

// Titles for the embed message
export const titles = [
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
] as const;

export interface WaifuImage {
  url: string;
  category: WaifuCategory;
  title: string;
}

const responseSchema = z.object({
  url: z.url()
});

export function isValidCategory(category: string): category is WaifuCategory {
  return categories.includes(category as WaifuCategory);
}

export async function getImage(category?: WaifuCategory): Promise<WaifuImage> {
  const selectedCategory = category ?? randomFrom([...categories]);

  // Reject if the provided category is not valid
  if (!isValidCategory(selectedCategory)) {
    throw new ValidationError(`Invalid category: ${selectedCategory}`, {
      category: selectedCategory,
      validCategories: [...categories]
    });
  }

  logger.debug('Fetching image', { category: selectedCategory });

  const res = await fetch(`https://api.waifu.pics/sfw/${selectedCategory}`);

  if (!res.ok) {
    throw new ExternalServiceError('waifu.pics', `API request failed with status ${res.status}`, {
      statusCode: res.status
    });
  }

  const result = responseSchema.safeParse(await res.json());
  if (!result.success) {
    throw new ExternalServiceError('waifu.pics', 'Invalid response format from API', {
      context: { errors: result.error.issues }
    });
  }

  logger.debug('Successfully fetched image', {
    category: selectedCategory,
    url: result.data.url
  });

  return {
    url: result.data.url,
    category: selectedCategory,
    title: randomFrom([...titles])
  };
}

const WaifuService = {
  categories,
  titles,
  getImage,
  isValidCategory
};

export default WaifuService;
