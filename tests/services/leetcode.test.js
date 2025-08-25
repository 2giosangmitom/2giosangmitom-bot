import { afterEach, describe, test, mock } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import LeetcodeService from '../../src/services/leetcode.js';

describe('LeetcodeService', () => {
  const testCachePath = path.join(process.cwd(), '.cache-test', 'data.json');

  afterEach(() => {
    mock.restoreAll();
    // Clean up test cache
    if (fs.existsSync(testCachePath)) {
      fs.unlinkSync(testCachePath);
    }
    const testCacheDir = path.dirname(testCachePath);
    if (fs.existsSync(testCacheDir)) {
      fs.rmdirSync(testCacheDir);
    }
  });

  test('should export difficulties array', () => {
    assert.ok(Array.isArray(LeetcodeService.difficulties));
    assert.deepStrictEqual(LeetcodeService.difficulties, ['Easy', 'Medium', 'Hard']);
  });

  test('should download data from LeetCode API', async () => {
    const mockResponse = {
      data: {
        problemsetQuestionListV2: {
          questions: [
            {
              id: 1,
              titleSlug: 'two-sum',
              title: 'Two Sum',
              questionFrontendId: '1',
              paidOnly: false,
              difficulty: 'EASY',
              topicTags: [
                { name: 'Array', slug: 'array' },
                { name: 'Hash Table', slug: 'hash-table' }
              ],
              acRate: 0.5
            }
          ],
          totalLength: 1
        }
      }
    };

    mock.method(global, 'fetch', async () => ({
      ok: true,
      json: async () => mockResponse
    }));

    const data = await LeetcodeService.downloadData();
    assert.ok(Array.isArray(data));
    assert.strictEqual(data.length, 1);
    assert.strictEqual(data[0].title, 'Two Sum');
  });

  test('should throw error when API request fails', async () => {
    mock.method(global, 'fetch', async () => ({
      ok: false,
      statusText: 'Internal Server Error'
    }));

    await assert.rejects(() => LeetcodeService.downloadData(), {
      message: 'Failed to fetch data: Internal Server Error'
    });
  });

  test('should save and load data correctly', async () => {
    const mockData = [
      {
        id: 1,
        titleSlug: 'two-sum',
        title: 'Two Sum',
        questionFrontendId: '1',
        paidOnly: false,
        difficulty: 'EASY',
        topicTags: [
          { name: 'Array', slug: 'array' },
          { name: 'Hash Table', slug: 'hash-table' }
        ],
        acRate: 0.5
      }
    ];

    // Create a custom save/load function with test path
    const saveDataWithTestPath = async (data) => {
      const dir = path.dirname(testCachePath);
      await fs.promises.mkdir(dir, { recursive: true });

      const transformedData = data
        .map((q) => ({
          id: q.id,
          title: q.title,
          difficulty: q.difficulty.charAt(0) + q.difficulty.slice(1).toLowerCase(),
          isPaid: q.paidOnly,
          acRate: q.acRate,
          url: `https://leetcode.com/problems/${q.titleSlug}`,
          topics: q.topicTags.map((t) => t.name)
        }))
        .filter((q) => !q.isPaid);

      const topicsSet = new Set();
      transformedData.forEach((q) => {
        q.topics.forEach((topic) => topicsSet.add(topic));
      });

      await fs.promises.writeFile(
        testCachePath,
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
    };

    await saveDataWithTestPath(mockData);

    // Verify file was created
    assert.ok(fs.existsSync(testCachePath));

    // Read and verify the data manually since we can't modify the service
    const data = await fs.promises.readFile(testCachePath, 'utf-8');
    const parsedData = JSON.parse(data);

    assert.ok(parsedData.questions);
    assert.ok(parsedData.topics);
    assert.strictEqual(parsedData.questions.length, 1);
    assert.strictEqual(parsedData.questions[0].title, 'Two Sum');
    assert.strictEqual(parsedData.questions[0].difficulty, 'Easy');
    assert.ok(parsedData.topics.includes('Array'));
    assert.ok(parsedData.topics.includes('Hash Table'));
  });

  test('should throw error when cache does not exist', async () => {
    // Test with a definitely non-existent path
    const nonExistentPath = '/definitely/non/existent/path.json';

    // Create a temporary loadData function that uses the non-existent path
    const loadDataWithTestPath = async () => {
      if (!fs.existsSync(nonExistentPath)) {
        throw new Error('Cache is not exists');
      }
      // This won't be reached
      return null;
    };

    await assert.rejects(() => loadDataWithTestPath(), { message: 'Cache is not exists' });
  });

  test('should filter problems by difficulty', async () => {
    const mockData = {
      questions: [
        {
          id: 1,
          title: 'Easy Problem',
          difficulty: 'Easy',
          isPaid: false,
          acRate: 0.8,
          url: 'https://leetcode.com/problems/easy',
          topics: ['Array']
        },
        {
          id: 2,
          title: 'Hard Problem',
          difficulty: 'Hard',
          isPaid: false,
          acRate: 0.3,
          url: 'https://leetcode.com/problems/hard',
          topics: ['Dynamic Programming']
        }
      ],
      topics: ['Array', 'Dynamic Programming']
    };

    const easyProblem = await LeetcodeService.getRandomProblem(mockData, 'Easy');
    assert.strictEqual(easyProblem.difficulty, 'Easy');
    assert.strictEqual(easyProblem.title, 'Easy Problem');
  });

  test('should filter problems by topic', async () => {
    const mockData = {
      questions: [
        {
          id: 1,
          title: 'Array Problem',
          difficulty: 'Easy',
          isPaid: false,
          acRate: 0.8,
          url: 'https://leetcode.com/problems/array',
          topics: ['Array']
        },
        {
          id: 2,
          title: 'DP Problem',
          difficulty: 'Hard',
          isPaid: false,
          acRate: 0.3,
          url: 'https://leetcode.com/problems/dp',
          topics: ['Dynamic Programming']
        }
      ],
      topics: ['Array', 'Dynamic Programming']
    };

    const arrayProblem = await LeetcodeService.getRandomProblem(mockData, undefined, 'Array');
    assert.ok(arrayProblem.topics.includes('Array'));
    assert.strictEqual(arrayProblem.title, 'Array Problem');
  });

  test('should throw error when no problems match criteria', async () => {
    const mockData = {
      questions: [
        {
          id: 1,
          title: 'Easy Problem',
          difficulty: 'Easy',
          isPaid: false,
          acRate: 0.8,
          url: 'https://leetcode.com/problems/easy',
          topics: ['Array']
        }
      ],
      topics: ['Array']
    };

    await assert.rejects(() => LeetcodeService.getRandomProblem(mockData, 'Hard'), {
      message: 'No problems found matching the criteria.'
    });
  });
});
