import path from 'node:path';
import { z } from 'zod';
import fs from 'node:fs';
import { randomFrom, toTitleCase } from '../lib/utils';
import { createLogger } from '../lib/logger';
import { ExternalServiceError, NotFoundError } from '../lib/errors';

const logger = createLogger('LeetCodeService');

const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';
const LEETCODE_PROBLEM_URL = 'https://leetcode.com/problems';

const query = String.raw`query problemsetQuestionListV2($filters: QuestionFilterInput, $limit: Int, $skip: Int) {
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
}`;

const graphqlPostPayload = JSON.stringify({
  query,
  variables: {
    skip: 0,
    limit: 10000,
    filters: {
      filterCombineType: 'ALL'
    }
  }
});

export const difficulties = ['Easy', 'Medium', 'Hard'] as const;
export type Difficulty = (typeof difficulties)[number];

export const cachePath = path.join(process.cwd(), '.cache', 'data.json');

export interface LeetCodeQuestion {
  id: number;
  title: string;
  difficulty: Difficulty;
  isPaid: boolean;
  acRate: number;
  url: string;
  topics: string[];
}

export interface LeetCodeData {
  questions: LeetCodeQuestion[];
  topics: string[];
}

interface RawQuestion {
  id: number;
  titleSlug: string;
  title: string;
  questionFrontendId: string;
  paidOnly: boolean;
  difficulty: string;
  topicTags: { name: string; slug: string }[];
  acRate: number;
}

const rawQuestionSchema = z.object({
  data: z.object({
    problemsetQuestionListV2: z.object({
      questions: z.array(
        z.object({
          id: z.number(),
          titleSlug: z.string(),
          title: z.string(),
          questionFrontendId: z.string(),
          paidOnly: z.boolean(),
          difficulty: z.enum(difficulties.map((d) => d.toUpperCase()) as [string, ...string[]]),
          topicTags: z.array(
            z.object({
              name: z.string(),
              slug: z.string()
            })
          ),
          acRate: z.number()
        })
      ),
      totalLength: z.number()
    })
  })
});

const cachedDataSchema = z.object({
  questions: z.array(
    z.object({
      id: z.number(),
      title: z.string(),
      difficulty: z.enum(difficulties),
      isPaid: z.boolean(),
      acRate: z.number(),
      url: z.url(),
      topics: z.array(z.string())
    })
  ),
  topics: z.array(z.string())
});

export async function downloadData(): Promise<RawQuestion[]> {
  logger.info('Downloading LeetCode problem data...');

  const response = await fetch(LEETCODE_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: graphqlPostPayload
  });

  if (!response.ok) {
    throw new ExternalServiceError('LeetCode', `GraphQL request failed: ${response.statusText}`, {
      statusCode: response.status
    });
  }

  const result = rawQuestionSchema.safeParse(await response.json());
  if (!result.success) {
    throw new ExternalServiceError('LeetCode', 'Invalid response format from GraphQL API', {
      context: { errors: result.error.issues }
    });
  }

  const questions = result.data.data.problemsetQuestionListV2.questions;
  logger.info('Downloaded LeetCode data', { questionCount: questions.length });

  return questions;
}

export async function saveData(data: RawQuestion[]): Promise<void> {
  const dir = path.dirname(cachePath);
  await fs.promises.mkdir(dir, { recursive: true });

  const transformedData = data
    .map((q) => ({
      id: q.id,
      title: q.title,
      difficulty: toTitleCase(q.difficulty) as Difficulty,
      isPaid: q.paidOnly,
      acRate: q.acRate,
      url: `${LEETCODE_PROBLEM_URL}/${q.titleSlug}`,
      topics: q.topicTags.map((t) => t.name)
    }))
    .filter((q) => !q.isPaid);

  const topicsSet = new Set<string>();
  transformedData.forEach((q) => {
    q.topics.forEach((topic) => topicsSet.add(topic));
  });

  const cacheData = {
    questions: transformedData,
    topics: Array.from(topicsSet).sort()
  };

  await fs.promises.writeFile(cachePath, JSON.stringify(cacheData, null, 2), 'utf-8');

  logger.info('Saved LeetCode data to cache', {
    path: cachePath,
    questionCount: transformedData.length,
    topicCount: cacheData.topics.length
  });
}

export async function loadData(): Promise<LeetCodeData> {
  if (!fs.existsSync(cachePath)) {
    throw new NotFoundError('LeetCode cache', { path: cachePath });
  }

  logger.debug('Loading cached LeetCode data', { path: cachePath });

  const data = await fs.promises.readFile(cachePath, 'utf-8');
  const result = cachedDataSchema.safeParse(JSON.parse(data));

  if (!result.success) {
    throw new ExternalServiceError('LeetCode', 'Invalid cache data format', {
      context: { errors: result.error.issues }
    });
  }

  logger.debug('Loaded cached data', {
    questionCount: result.data.questions.length,
    topicCount: result.data.topics.length
  });

  return result.data;
}

export async function getRandomProblem(
  data: LeetCodeData,
  difficulty?: string,
  topic?: string
): Promise<LeetCodeQuestion> {
  const filteredData = data.questions.filter((q) => {
    if (difficulty && q.difficulty.toLowerCase() !== difficulty.toLowerCase()) {
      return false;
    }
    if (topic && !q.topics.includes(topic)) {
      return false;
    }
    return true;
  });

  if (filteredData.length === 0) {
    throw new NotFoundError('LeetCode problem', {
      difficulty,
      topic,
      message: 'No problems found matching the criteria'
    });
  }

  const problem = randomFrom(filteredData);
  logger.debug('Selected random problem', {
    id: problem.id,
    title: problem.title,
    difficulty: problem.difficulty
  });

  return problem;
}

const LeetcodeService = {
  difficulties,
  cachePath,
  downloadData,
  saveData,
  loadData,
  getRandomProblem
};

export default LeetcodeService;
