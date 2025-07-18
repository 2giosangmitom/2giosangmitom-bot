/**
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 * @license MIT
 * @copyright © 2025 Vo Quang Chien
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import process from 'node:process';
import { randomFrom } from '~/lib/utils';

const cachePath = path.join(process.cwd(), '.cache', 'data.json');
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

const difficulties = ['Easy', 'Medium', 'Hard'];

/**
 * @description Downloads LeetCode problem data and caches it locally.
 */
async function downloadData(): Promise<void> {
  const response = await fetch(`https://leetcode.com/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: graphqlPostPayload
  });

  if (!response.ok) {
    throw new Error(`Request failed. Status Code: ${response.status}`);
  }

  const json: LeetCodeResponse = await response.json();

  const questions = json?.data?.problemsetQuestionListV2?.questions;
  if (!Array.isArray(questions)) {
    throw new Error('Invalid response structure from LeetCode API');
  }

  const problems = questions.map((q) => ({
    id: q.id,
    title: q.title,
    difficulty: q.difficulty.toLowerCase(),
    isPaid: q.paidOnly,
    acRate: q.acRate,
    url: `https://leetcode.com/problems/${q.titleSlug}`,
    topics: q.topicTags.map((t) => t.name)
  }));

  const data: LeetCodeData = {
    metadata: {
      totalProblems: problems.length,
      lastUpdate: new Date().toISOString()
    },
    problems,
    topics: [...new Set(problems.map((problem) => problem.topics).flat()).values()]
  };

  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.writeFile(cachePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * @description Loads cached data from disk.
 */
async function loadData(): Promise<LeetCodeData | null> {
  try {
    const raw = await fs.readFile(cachePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * @description Validates the structure of the cached data.
 */
async function validateData(): Promise<boolean> {
  const raw = await loadData();
  if (!raw) return false;

  const meta = raw.metadata;
  const problems = raw.problems;
  const topics = raw.topics;

  return (
    meta &&
    typeof meta.totalProblems === 'number' &&
    typeof meta.lastUpdate === 'string' &&
    Array.isArray(problems) &&
    problems.every((v) => {
      for (const key of ['id', 'title', 'difficulty', 'isPaid', 'acRate', 'url', 'topics']) {
        if (!(key in v)) return false;
      }
      return true;
    }) &&
    Array.isArray(topics)
  );
}

/**
 * @description Filters problems by criteria.
 * @param data The original data from LeetCode.
 * @param difficulty Allowed difficulty, random if undefined.
 * @param topic Allowed topic, random if undefined.
 * @param includePaid Include paid-only problems, false if undefined.
 */
function filterQuestions(
  data: LeetCodeData,
  difficulty?: string,
  topic?: string,
  includePaid = false
) {
  const chosenDifficulty = difficulty?.toLowerCase() || randomFrom(difficulties)?.toLowerCase();
  const chosenTopic = topic?.toLowerCase() || randomFrom(data.topics)?.toLowerCase();

  if (!chosenDifficulty || !chosenTopic) {
    return [];
  }

  return data.problems.filter(
    (problem) =>
      problem.difficulty.toLowerCase() === chosenDifficulty &&
      problem.topics.some((t) => t.toLowerCase() === chosenTopic) &&
      (includePaid || !problem.isPaid)
  );
}

export { downloadData, loadData, validateData, filterQuestions, difficulties };
