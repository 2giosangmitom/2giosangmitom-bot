/**
 * @file Manage LeetCode data, functions to filter, get question
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 */

import path from 'node:path';
import fs from 'node:fs';
import type { LeetCodeData, LeetCodeResponse } from '~/types';
import type { Client } from 'discord.js';
import { randomFrom } from '~/lib/utils';

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

const cachePath = path.join(process.cwd(), '.cache', 'data.json');

class LeetCodeService {
  private data: LeetCodeData | undefined;
  private client: Client | undefined;

  constructor(client?: Client) {
    this.client = client;

    const raw = this.loadData();
    if (!fs.existsSync(cachePath) || !this.validateData(raw)) {
      this.client?.log.warn('Cache file or cached data not valid');
      this.client?.log.info('Downloading new data');
      this.downloadData().then((data) => {
        this.data = data;
        this.client?.log.info('LeetCode service is ready');
      });
    } else {
      this.client?.log.info('Cache is valid');
      this.data = raw;
    }
  }

  isReady() {
    return this.data !== undefined;
  }

  async downloadData() {
    const response = await fetch(`https://leetcode.com/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: graphqlPostPayload
    });

    if (!response.ok) {
      throw new Error(`Request failed. Status Code: ${response.status}`);
    }

    const json = (await response.json()) as LeetCodeResponse;

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

    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, JSON.stringify(data, null, 2), 'utf-8');

    return data;
  }

  validateData(data: unknown): data is LeetCodeData {
    if (!data || typeof data !== 'object' || data === null) {
      return false;
    }

    const { metadata, problems, topics } = data as any;

    if (
      !metadata ||
      typeof metadata !== 'object' ||
      typeof metadata.totalProblems !== 'number' ||
      !Number.isFinite(metadata.totalProblems) ||
      typeof metadata.lastUpdate !== 'string' ||
      !Array.isArray(problems) ||
      !Array.isArray(topics)
    ) {
      return false;
    }

    return problems.every((problem) => {
      return (
        problem &&
        typeof problem === 'object' &&
        typeof problem.id === 'number' &&
        typeof problem.title === 'string' &&
        typeof problem.difficulty === 'string' &&
        typeof problem.isPaid === 'boolean' &&
        typeof problem.acRate === 'number' &&
        typeof problem.url === 'string' &&
        Array.isArray(problem.topics) &&
        problem.topics.every((t: unknown) => typeof t === 'string')
      );
    });
  }

  loadData(): unknown {
    try {
      const raw = fs.readFileSync(cachePath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  filterQuestions(difficulty?: string, topic?: string, includePaid = false) {
    if (!this.data) return [];

    difficulty = difficulty?.toLowerCase();
    topic = topic?.toLowerCase();

    return this.data.problems.filter((problem) => {
      if (!includePaid && problem.isPaid) return false;
      if (difficulty && problem.difficulty !== difficulty) return false;
      if (topic && !problem.topics.some((t) => t.toLowerCase() === topic)) return false;
      return true;
    });
  }

  pickRandomQuestion(difficulty?: string, topic?: string, includePaid = false) {
    const filtered = this.filterQuestions(difficulty, topic, includePaid);
    return randomFrom(filtered);
  }

  getTopics() {
    return this.data?.topics;
  }
}

export default LeetCodeService;
export { difficulties };
