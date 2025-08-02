import { randomFrom } from '../lib/utils.js';
import { inlineCode } from 'discord.js';
import z from 'zod';

namespace WaifuService {
  // Allowed categories from waifu.pics
  export const categories = ['waifu', 'hug', 'kiss', 'happy', 'handhold', 'bite', 'slap'];

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
  ];

  export async function getImage(
    category?: string
  ): Promise<{ url: string; category: string; title: string }> {
    category = category ?? randomFrom(categories)!;

    // Reject if the provided category is not valid
    if (!categories.includes(category)) {
      throw new Error(`The ${inlineCode(category)} category is not valid`);
    }

    // Fetch the image
    const res = await fetch(`https://api.waifu.pics/sfw/${category}`);

    if (!res.ok) {
      throw new Error(
        `The waifu.pics API is not available at the moment. Status code: ${res.status}`
      );
    }

    // Validate the response JSON
    const schema = z.object({
      url: z.url()
    });

    const result = schema.safeParse(await res.json());
    if (!result.success) {
      throw new Error(
        `The responsed JSON from waifu.pics is not valid.\n${z.prettifyError(result.error)}`
      );
    }

    return {
      url: result.data.url,
      category,
      title: randomFrom(titles)!
    };
  }
}

export default WaifuService;
