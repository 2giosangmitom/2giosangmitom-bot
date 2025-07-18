/**
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 * @license MIT
 * @copyright © 2025 Vo Quang Chien
 */

/**
 * Get random element from the provided array
 * @param arr The array for get random element from
 * @returns Random element from array or null if empty
 */
function randomFrom<T>(arr: readonly T[]): T | null {
  if (arr.length === 0) {
    return null;
  }
  return arr[Math.floor(Math.random() * arr.length)];
}

export { randomFrom };
