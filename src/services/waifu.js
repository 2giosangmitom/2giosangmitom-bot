import { randomFrom } from '../lib/utils.js';
import * as https from 'node:https';

const categories = ['waifu', 'hug', 'kiss', 'happy', 'handhold', 'bite'];
const url = 'https://api.waifu.pics/sfw';

/**
 * Calls the waifu.pics API and returns an image URL with its category.
 * @param {string} [category] - Optional category to fetch; will pick random if undefined
 * @returns {Promise<{ url: string, category: string }>}
 */
function getImage(category) {
  return new Promise((resolve, reject) => {
    if (!category) {
      category = randomFrom(categories);
    }
    if (!categories.includes(category)) {
      return reject('The requested category is not available');
    }

    https
      .get(`${url}/${category}`, (res) => {
        const { statusCode, headers } = res;

        if (statusCode !== 200) {
          res.resume(); // Discard response to free memory
          return reject(`Request Failed. Status Code: ${statusCode}`);
        }

        if (!/^application\/json/.test(headers['content-type'])) {
          res.resume();
          return reject(`Invalid content-type. Expected application/json but received ${headers['content-type']}`);
        }

        let rawData = '';
        res.setEncoding('utf-8');
        res.on('data', (chunk) => (rawData += chunk));

        res.on('end', () => {
          try {
            const json = JSON.parse(rawData);
            resolve({ url: json?.url, category });
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', (e) => {
        reject(e);
      });
  });
}

export { getImage, categories };
