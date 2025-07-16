import { randomFrom } from '../lib/utils.js';

const categories = ['waifu', 'hug', 'kiss', 'happy', 'handhold', 'bite'];
const url = 'https://api.waifu.pics/sfw';

/**
 * Calls the waifu.pics API and returns an image URL with its category.
 * @param {string} [category] - Optional category to fetch; will pick random if undefined
 * @returns {Promise<{ url: string, category: string }>}
 */
async function getImage(category) {
  if (!category) {
    category = randomFrom(categories);
  }
  if (!categories.includes(category)) {
    throw new Error('The requested category is not available');
  }

  const response = await fetch(`${url}/${category}`);

  if (!response.ok) {
    throw new Error(`Request Failed. Status Code: ${response.status}`);
  }

  const json = await response.json();

  return { url: json?.url, category };
}

export { getImage, categories };
