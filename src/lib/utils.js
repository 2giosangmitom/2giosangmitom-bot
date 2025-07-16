/**
 * Pick a random element from an array
 * @template T
 * @param {T[]} arr - The input array
 * @returns {T | null} A random element from the array, or null if array is empty/invalid
 * @throws {TypeError} When input is not an array
 */
function randomFrom(arr) {
  if (!Array.isArray(arr)) {
    throw new TypeError('Input must be an array');
  }

  if (arr.length === 0) {
    return null;
  }

  return arr[Math.floor(Math.random() * arr.length)];
}

export { randomFrom };
