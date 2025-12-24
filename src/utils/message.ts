/**
 * Discord message character limit
 */
export const DISCORD_MESSAGE_LIMIT = 2000;

/**
 * Splits a message into chunks that fit within Discord's character limit.
 * Tries to split at newlines or spaces to avoid breaking words.
 *
 * @param content - The content to split
 * @param maxLength - Maximum length per chunk (default: 2000)
 * @returns Array of message chunks
 */
export function splitMessage(
  content: string,
  maxLength: number = DISCORD_MESSAGE_LIMIT,
): string[] {
  if (content.length <= maxLength) {
    return [content];
  }

  const chunks: string[] = [];
  let remaining = content;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Find a good split point (newline or space)
    let splitIndex = remaining.lastIndexOf("\n", maxLength);

    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      // No good newline found, try space
      splitIndex = remaining.lastIndexOf(" ", maxLength);
    }

    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      // No good split point, force split at maxLength
      splitIndex = maxLength;
    }

    chunks.push(remaining.slice(0, splitIndex));
    remaining = remaining.slice(splitIndex).trimStart();
  }

  return chunks;
}
