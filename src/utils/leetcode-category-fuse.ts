import Fuse, { type IFuseOptions } from "fuse.js";

/**
 * Fuse.js configuration for category autocomplete.
 */
const FUSE_OPTIONS: IFuseOptions<string> = {
  includeScore: false,
  threshold: 0.4,
  ignoreLocation: true,
  minMatchCharLength: 1,
};

let fuseInstance: Fuse<string> | null = null;
let categoriesCache: string[] = [];

/**
 * Initializes the Fuse instance with given categories.
 */
export function initializeCategoryFuse(categories: string[]): void {
  categoriesCache = [...categories].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase()),
  );
  fuseInstance = new Fuse(categoriesCache, FUSE_OPTIONS);
}

/**
 * Searches categories using fuzzy matching.
 * Returns top matches (max 25 for Discord autocomplete limit).
 */
export function searchCategories(query: string): string[] {
  if (!fuseInstance) {
    return [];
  }

  if (!query || query.trim() === "") {
    // Return first 25 categories when no query
    return categoriesCache.slice(0, 25);
  }

  const results = fuseInstance.search(query, { limit: 25 });
  return results.map((r) => r.item);
}

/**
 * Returns all available categories.
 */
export function getAllCategories(): string[] {
  return [...categoriesCache];
}

/**
 * Clears the Fuse instance (for testing purposes).
 */
export function clearCategoryFuse(): void {
  fuseInstance = null;
  categoriesCache = [];
}
