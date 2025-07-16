/**
 * Pick a random element from an array
 * @template T
 * @param {T[]} arr
 * @returns {T | null}
 */
function randomFrom(arr) {
   if (!arr || arr.length === 0) {
    return null;
  }
  return arr[Math.floor(Math.random() * arr.length)];
}

export { randomFrom };
