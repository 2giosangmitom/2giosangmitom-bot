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

/**
 * Set an interval that calls the callback immediately and then at the specified delay
 * @param callback The function to call at the specified interval
 * @param delay The delay in milliseconds between calls
 * @returns A NodeJS.Timeout object that can be used to clear the interval
 * @example
 * const interval = setIntervalImmediate(() => {
 *   console.log('This will run immediately and then every 1000ms');
 * }, 1000);
 */
function setIntervalImmediate(callback: () => void, delay: number): NodeJS.Timeout {
  const interval = setInterval(callback, delay);
  callback(); // Call immediately
  return interval;
}

export { randomFrom, setIntervalImmediate };
