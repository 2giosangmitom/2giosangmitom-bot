import * as process from 'node:process';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

/**
 * @typedef {Object} Problem
 * @property {number} id
 * @property {string} title
 * @property {string} difficulty
 * @property {boolean} isPaid
 * @property {number} acRate
 * @property {string} url
 * @property {string[]} topics
 */

/**
 * @typedef {Object} LeetCodeData
 * @property {{ totalProblems: number, lastUpdate: string }} metadata
 * @property {Problem[]} problems
 */

const leetcodeUrl = 'https://leetcode.com';
const graphqlUrl = `${leetcodeUrl}/graphql`;
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

/**
 * Downloads LeetCode problem data and caches it locally.
 * @returns {Promise<void>}
 */
async function downloadData() {
  const response = await fetch(graphqlUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: graphqlPostPayload
  });

  if (!response.ok) {
    throw new Error(`Request failed. Status Code: ${response.status}`);
  }

  /** @type {{ data: { problemsetQuestionListV2: { questions: any[] } } }} */
  const json = await response.json();

  const questions = json?.data?.problemsetQuestionListV2?.questions;
  if (!Array.isArray(questions)) {
    throw new Error('Invalid response structure from LeetCode API');
  }

  const problems = questions.map((q) => ({
    id: q.id,
    title: q.title,
    difficulty: q.difficulty?.toLowerCase(),
    isPaid: q.paidOnly,
    acRate: q.acRate,
    url: `${leetcodeUrl}/problems/${q.titleSlug}`,
    // @ts-ignore
    topics: q.topicTags.map((t) => t.name)
  }));

  const data = {
    metadata: {
      totalProblems: problems.length,
      lastUpdate: new Date().toISOString()
    },
    problems
  };

  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.writeFile(cachePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Loads cached data from disk.
 * @returns {Promise<LeetCodeData|null>}
 */
async function loadData() {
  try {
    const raw = await fs.readFile(cachePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Validates the structure of the cached data.
 * @returns {Promise<boolean>}
 */
async function validateData() {
  const raw = await loadData();
  if (!raw) return false;

  const meta = raw.metadata;
  const problems = raw.problems;

  return (
    meta && typeof meta.totalProblems === 'number' && typeof meta.lastUpdate === 'string' && Array.isArray(problems)
  );
}

/**
 * Placeholder: filters problems by criteria.
 */
function filterQuestions(/* criteria */) {
  // To be implemented
}

/**
 * Placeholder: picks random problems.
 */
function pickRandomQuestions(/* count */) {
  // To be implemented
}

/**
 * Ensures LeetCode data is cached and valid, or fetches it.
 * @param {import('pino').Logger} log
 * @returns {Promise<void>}
 */
async function initializeData(log) {
  try {
    await fs.access(cachePath);
    log.info('Found existing cache file.');
    log.info('Validating cached data...');
    const valid = await validateData();

    if (valid) {
      log.info('Cache is valid. No need to re-fetch.');
      return;
    }

    log.warn('Cache is invalid. Re-downloading data...');
  } catch {
    log.warn('Cache file not found. Fetching data from LeetCode...');
  }

  try {
    await downloadData();
    log.info('LeetCode data downloaded and cached.');
  } catch (err) {
    log.error(err);
  }
}

export { downloadData, loadData, validateData, filterQuestions, pickRandomQuestions, initializeData };
