import path from 'node:path';
import z from 'zod';
import fs from 'node:fs';
import { randomFrom, toTitleCase } from '../lib/utils';

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

export async function downloadData(): Promise<RawQuestion[]> {
  const response = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: graphqlPostPayload
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.statusText}`);
  }

  const schema = z.object({
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

  const result = schema.safeParse(await response.json());
  if (!result.success) {
    throw new Error(`Invalid data format: ${z.prettifyError(result.error)}`);
  }

  return result.data.data.problemsetQuestionListV2.questions;
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
      url: `https://leetcode.com/problems/${q.titleSlug}`,
      topics: q.topicTags.map((t) => t.name)
    }))
    .filter((q) => !q.isPaid);

  const topicsSet = new Set<string>();
  transformedData.forEach((q) => {
    q.topics.forEach((topic) => topicsSet.add(topic));
  });

  await fs.promises.writeFile(
    cachePath,
    JSON.stringify(
      {
        questions: transformedData,
        topics: Array.from(topicsSet)
      },
      null,
      2
    ),
    'utf-8'
  );
}

export async function loadData(): Promise<LeetCodeData> {
  if (!fs.existsSync(cachePath)) {
    throw new Error('Cache is not exists');
  }

  const data = await fs.promises.readFile(cachePath, 'utf-8');
  const schema = z.object({
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

  const result = schema.safeParse(JSON.parse(data));
  if (!result.success) {
    throw new Error(`Invalid data format: ${z.prettifyError(result.error)}`);
  }

  return result.data;
}

export async function getRandomProblem(
  data: LeetCodeData,
  difficulty?: string,
  topic?: string
): Promise<LeetCodeQuestion> {
  const filteredData = data.questions.filter((q) => {
    // Match difficulty
    if (difficulty && q.difficulty.toLowerCase() !== difficulty.toLowerCase()) return false;
    // Match topic
    if (topic && !q.topics.includes(topic)) return false;
    return true;
  });

  if (filteredData.length === 0) {
    throw new Error('No problems found matching the criteria.');
  }

  return randomFrom(filteredData);
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
