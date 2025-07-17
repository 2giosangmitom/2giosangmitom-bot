import { randomFrom } from '~/lib/utils';

/** @description Allowed categories from waifu.pics */
const categories = ['waifu', 'hug', 'kiss', 'happy', 'handhold', 'bite', 'slap'];

/** @description Titles for the embed message */
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
  "Waifu's Blessing Incoming! 🍀"
];

/**
 * @description Get random image from waifu.pics
 * @param category The category of the image
 * @returns The image url with its title and random title.
 */
async function getImage(
  category?: string
): Promise<{ url: string; category: string; title: string }> {
  const finalCategory = category || randomFrom(categories)!;

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

  const json: WaifuPicsResponse = await res.json();

  return { url: json.url, category: finalCategory, title: randomFrom(titles)! };
}

export { categories, titles, getImage };
