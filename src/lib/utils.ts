export function randomFrom<T>(arr: readonly T[]): T | undefined {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
