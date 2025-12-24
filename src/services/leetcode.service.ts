import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { container } from "@sapphire/framework";
import { initializeCategoryFuse } from "../utils/leetcode-category-fuse.js";

export interface LeetCodeProblem {
  id: string;
  frontendId: string;
  title: string;
  titleSlug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  acRate: number;
  tags: string[];
}

export interface ProblemFilter {
  difficulty?: "Easy" | "Medium" | "Hard";
  category?: string;
}

interface GraphQLQuestion {
  id: string;
  questionFrontendId: string;
  title: string;
  titleSlug: string;
  paidOnly: boolean;
  difficulty: string;
  acRate: number;
  topicTags: Array<{ name: string; slug: string }>;
}

interface GraphQLResponse {
  data: {
    problemsetQuestionListV2: {
      questions: GraphQLQuestion[];
      totalLength: number;
    };
  };
}

const DATA_FILE_PATH = "data/leetcode.json";

let cache: LeetCodeProblem[] = [];

/**
 * Fetches problems from LeetCode GraphQL API.
 */
async function fetchProblemsFromAPI(): Promise<GraphQLQuestion[]> {
  const query = String.raw`
query problemsetQuestionListV2($filters: QuestionFilterInput, $limit: Int, $skip: Int) {
  problemsetQuestionListV2(
    filters: $filters
    limit: $limit
    skip: $skip
  ) {
    questions {
      id
      titleSlug
      title
      questionFrontendId
      paidOnly
      difficulty
      topicTags {
        name
        slug
      }
      acRate
    }
    totalLength
  }
}
`;

  const graphqlPostPayload = JSON.stringify({
    query,
    variables: {
      skip: 0,
      limit: 10000,
      filters: {
        filterCombineType: "ALL",
      },
    },
  });

  const response = await fetch("https://leetcode.com/graphql/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: graphqlPostPayload,
  });

  if (!response.ok) {
    throw new Error(`LeetCode API error: ${response.status}`);
  }

  const data = (await response.json()) as GraphQLResponse;
  return data.data.problemsetQuestionListV2.questions;
}

/**
 * Normalizes a GraphQL question to our internal format.
 * Filters out paid problems.
 */
function normalizeProblems(questions: GraphQLQuestion[]): LeetCodeProblem[] {
  return questions
    .filter((q) => !q.paidOnly)
    .map((q) => ({
      id: q.id,
      frontendId: q.questionFrontendId,
      title: q.title,
      titleSlug: q.titleSlug,
      difficulty: q.difficulty as "Easy" | "Medium" | "Hard",
      acRate: Math.round(q.acRate * 100) / 100,
      tags: q.topicTags.map((t) => t.name),
    }));
}

/**
 * Saves problems to JSON file.
 */
async function saveToFile(problems: LeetCodeProblem[]): Promise<void> {
  await mkdir(dirname(DATA_FILE_PATH), { recursive: true });
  await writeFile(DATA_FILE_PATH, JSON.stringify(problems, null, 2), "utf-8");
}

/**
 * Extracts unique categories from problems and initializes Fuse.
 */
function updateCategoryIndex(): void {
  const uniqueCategories = new Set<string>();
  for (const problem of cache) {
    for (const tag of problem.tags) {
      uniqueCategories.add(tag);
    }
  }
  initializeCategoryFuse([...uniqueCategories]);
}

/**
 * Loads problems from JSON file into memory cache.
 */
export async function loadFromFile(): Promise<void> {
  try {
    const content = await readFile(DATA_FILE_PATH, "utf-8");
    const problems = JSON.parse(content) as LeetCodeProblem[];
    cache = problems;
    updateCategoryIndex();
    container.logger.info(
      `[LeetCodeService] Loaded ${cache.length} problems from file`,
    );
  } catch {
    container.logger.info(
      "[LeetCodeService] No existing data file, cache is empty",
    );
    cache = [];
  }
}

/**
 * Refreshes problems from API, saves to file, and updates cache.
 */
export async function refreshProblems(): Promise<void> {
  container.logger.info("[LeetCodeService] Starting refresh...");

  try {
    const questions = await fetchProblemsFromAPI();
    const problems = normalizeProblems(questions);

    await saveToFile(problems);
    cache = problems;
    updateCategoryIndex();

    container.logger.info(
      `[LeetCodeService] Refresh complete - ${problems.length} free problems cached`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    container.logger.error(`[LeetCodeService] Refresh failed: ${message}`);
    throw error;
  }
}

/**
 * Returns a random problem from memory cache, optionally filtered.
 * Returns null if no problems match or cache is empty.
 */
export function getRandomProblem(
  filter?: ProblemFilter,
): LeetCodeProblem | null {
  if (cache.length === 0) {
    return null;
  }

  let problems = cache;

  if (filter?.difficulty) {
    const difficultyLower = filter.difficulty.toLowerCase();
    problems = problems.filter(
      (p) => p.difficulty.toLowerCase() === difficultyLower,
    );
  }

  if (filter?.category) {
    const categoryLower = filter.category.toLowerCase();
    problems = problems.filter((p) =>
      p.tags.some((tag) => tag.toLowerCase() === categoryLower),
    );
  }

  if (problems.length === 0) {
    return null;
  }

  const index = Math.floor(Math.random() * problems.length);
  return problems[index] ?? null;
}

/**
 * Returns current cache size.
 */
export function getCacheSize(): number {
  return cache.length;
}

/**
 * Clears the cache (for testing purposes).
 */
export function clearCache(): void {
  cache = [];
}

/**
 * Sets the cache directly (for testing purposes).
 */
export function setCache(problems: LeetCodeProblem[]): void {
  cache = problems;
}
