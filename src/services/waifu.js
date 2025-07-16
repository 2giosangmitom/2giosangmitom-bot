import { randomFrom } from '../lib/utils.js';

/**
 * @typedef {Object} WaifuResponse
 * @property {string} url - The image URL
 * @property {string} category - The category of the image
 */

/** @type {string[]} */
const categories = ['waifu', 'hug', 'kiss', 'happy', 'handhold', 'bite'];
/** @type {string} */
const url = 'https://api.waifu.pics/sfw';

/**
 * Calls the waifu.pics API and returns an image URL with its category.
 * @param {string} [category] - Optional category to fetch; will pick random if undefined
 * @returns {Promise<WaifuResponse>}
 * @throws {Error} When the requested category is not available or API request fails
 */
async function getImage(category) {
  if (!category) {
    const randomCategory = randomFrom(categories);
    if (!randomCategory) {
      throw new Error('No categories available');
    }
    category = randomCategory;
  }

  // Convert to lowercase for comparison but preserve original case for API
  const normalizedCategory = category.toLowerCase();
  const validCategory = categories.find((cat) => cat.toLowerCase() === normalizedCategory);

  if (!validCategory) {
    throw new Error('The requested category is not available');
  }

  try {
    const response = await fetch(`${url}/${category}`);

    if (!response.ok) {
      throw new Error(`Request Failed. Status Code: ${response.status}`);
    }

    /** @type {{ url?: string }} */
    const json = await response.json();

    if (!json?.url) {
      throw new Error('Invalid response from waifu.pics API');
    }

    return { url: json.url, category };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred while fetching waifu image');
  }
}

export { getImage, categories };
