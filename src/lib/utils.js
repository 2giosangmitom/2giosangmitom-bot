export function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function toTitleCase(str) {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
