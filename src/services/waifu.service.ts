const SAFE_CATEGORIES = [
  "waifu",
  "neko",
  "shinobu",
  "megumin",
  "bully",
  "cry",
  "hug",
  "smile",
  "kiss",
  "happy",
  "handhold",
  "bite",
  "slap",
] as const;

export type SafeCategory = (typeof SAFE_CATEGORIES)[number];

const DEFAULT_CATEGORY: SafeCategory = "waifu";

export interface WaifuResponse {
  category: SafeCategory;
  imageUrl: string;
}

interface WaifuApiResponse {
  url: string;
}

/**
 * Validates and returns a safe category.
 * Falls back to default if invalid.
 */
export function validateCategory(
  category: string | null | undefined,
): SafeCategory {
  if (!category) {
    return DEFAULT_CATEGORY;
  }

  const normalized = category.toLowerCase();

  if (SAFE_CATEGORIES.includes(normalized as SafeCategory)) {
    return normalized as SafeCategory;
  }

  return DEFAULT_CATEGORY;
}

/**
 * Returns the list of allowed categories for command choices.
 */
export function getAllowedCategories(): readonly SafeCategory[] {
  return SAFE_CATEGORIES;
}

export class WaifuService {
  private readonly baseUrl = "https://api.waifu.pics/sfw";

  /**
   * Fetches a random SFW anime image from waifu.pics.
   * Only uses /sfw/ endpoints - NSFW is never accessed.
   */
  async fetchImage(category?: string): Promise<WaifuResponse> {
    const safeCategory = validateCategory(category);

    // Always use /sfw/ endpoint - hardcoded for safety
    const url = `${this.baseUrl}/${safeCategory}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Waifu API error: ${response.status}`);
    }

    const data = (await response.json()) as WaifuApiResponse;

    return {
      category: safeCategory,
      imageUrl: data.url,
    };
  }
}
