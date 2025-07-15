/**
 * Pick a random element from an array
 * @param {string[]} arr
 * @returns {string}
 */
function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export { randomFrom };
