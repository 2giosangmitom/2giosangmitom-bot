/**
 * @file Reuseable ultility functions
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 */

/**
 * Get random element from the provided array
 * @param arr The array for get random element from
 * @returns Random element from array or undefined if empty
 */
function randomFrom<T>(arr: readonly T[]): T | undefined {
  if (arr.length === 0) {
    return undefined;
  }
  return arr.at(Math.floor(Math.random() * arr.length));
}

export { randomFrom };
