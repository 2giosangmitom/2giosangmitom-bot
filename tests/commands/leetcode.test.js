import { afterEach, describe, test, mock } from 'node:test';
import assert from 'node:assert';
import leetcodeCommand, {
  getCachedData,
  setCachedData,
  updateLeetCodeData
} from '../../src/commands/leetcode.js';
import LeetcodeService from '../../src/services/leetcode.js';
import WaifuService from '../../src/services/waifu.js';

describe('Leetcode Command', () => {
  let originalCachedData;

  afterEach(() => {
    mock.restoreAll();
    // Restore original cached data if it was saved
    if (originalCachedData !== undefined) {
      setCachedData(originalCachedData);
      originalCachedData = undefined;
    }
  });

  test('should have correct command data structure', () => {
    assert.ok(leetcodeCommand.data);
    assert.strictEqual(leetcodeCommand.data.name, 'leetcode');
    assert.strictEqual(leetcodeCommand.data.description, 'Get random LeetCode problem');
    assert.ok(typeof leetcodeCommand.execute === 'function');
    assert.ok(typeof leetcodeCommand.autocomplete === 'function');
  });

  test('should have difficulty choices that match LeetcodeService difficulties', () => {
    const difficultyOption = leetcodeCommand.data.options.find((opt) => opt.name === 'difficulty');
    const choices = difficultyOption.choices.map((choice) => choice.value);

    assert.deepStrictEqual(choices.sort(), LeetcodeService.difficulties.sort());
  });

  test('should reply with error when no cached data is available', async () => {
    const mockInteraction = {
      reply: mock.fn(async () => {}),
      deferReply: mock.fn(async () => {}),
      options: {
        getString: mock.fn(() => null)
      }
    };

    // Save original and set to null
    originalCachedData = getCachedData();
    setCachedData(null);

    await leetcodeCommand.execute(mockInteraction);

    assert.strictEqual(mockInteraction.reply.mock.callCount(), 1);
    assert.strictEqual(mockInteraction.deferReply.mock.callCount(), 0);

    const replyCall = mockInteraction.reply.mock.calls[0];
    assert.ok(replyCall.arguments[0].content.includes('No LeetCode data available'));
  });

  test('should execute successfully with mock data', async () => {
    const mockData = {
      questions: [
        {
          id: 1,
          title: 'Two Sum',
          difficulty: 'Easy',
          isPaid: false,
          acRate: 0.5,
          url: 'https://leetcode.com/problems/two-sum',
          topics: ['Array', 'Hash Table']
        }
      ],
      topics: ['Array', 'Hash Table']
    };

    const mockInteraction = {
      deferReply: mock.fn(async () => {}),
      followUp: mock.fn(async () => {}),
      options: {
        getString: mock.fn((key) => {
          if (key === 'difficulty') return null;
          if (key === 'topic') return null;
          return null;
        })
      }
    };

    mock.method(LeetcodeService, 'getRandomProblem', async () => mockData.questions[0]);

    // Set cached data
    originalCachedData = getCachedData();
    setCachedData(mockData);

    await leetcodeCommand.execute(mockInteraction);

    assert.strictEqual(mockInteraction.deferReply.mock.callCount(), 1);
    assert.strictEqual(mockInteraction.followUp.mock.callCount(), 1);

    const followUpCall = mockInteraction.followUp.mock.calls[0];
    assert.ok(followUpCall.arguments[0].embeds);
    assert.strictEqual(followUpCall.arguments[0].embeds.length, 1);
  });

  test('should show motivation waifu for hard problems', async () => {
    const mockData = {
      questions: [
        {
          id: 1,
          title: 'Hard Problem',
          difficulty: 'Hard',
          isPaid: false,
          acRate: 0.2,
          url: 'https://leetcode.com/problems/hard',
          topics: ['Dynamic Programming']
        }
      ],
      topics: ['Dynamic Programming']
    };

    const mockInteraction = {
      deferReply: mock.fn(async () => {}),
      followUp: mock.fn(async () => {}),
      options: {
        getString: mock.fn(() => null)
      }
    };

    mock.method(LeetcodeService, 'getRandomProblem', async () => mockData.questions[0]);
    mock.method(WaifuService, 'getImage', async () => ({
      url: 'https://example.com/motivation.jpg',
      category: 'waifu',
      title: 'Motivation!'
    }));

    originalCachedData = getCachedData();
    setCachedData(mockData);

    await leetcodeCommand.execute(mockInteraction);

    // Should have called followUp twice: once for problem, once for motivation
    assert.strictEqual(mockInteraction.followUp.mock.callCount(), 2);

    const motivationCall = mockInteraction.followUp.mock.calls[1];
    assert.ok(motivationCall.arguments[0].content.includes('Motivation'));
  });

  test('should handle autocomplete with no cached data', async () => {
    const mockInteraction = {
      respond: mock.fn(async () => {}),
      options: {
        getFocused: mock.fn(() => 'test')
      }
    };

    originalCachedData = getCachedData();
    setCachedData(null);

    await leetcodeCommand.autocomplete(mockInteraction);

    assert.strictEqual(mockInteraction.respond.mock.callCount(), 1);
    assert.deepStrictEqual(mockInteraction.respond.mock.calls[0].arguments[0], []);
  });

  test('should handle autocomplete with empty search term', async () => {
    const mockData = {
      topics: ['Array', 'Hash Table', 'Dynamic Programming', 'String', 'Math']
    };

    const mockInteraction = {
      respond: mock.fn(async () => {}),
      options: {
        getFocused: mock.fn(() => '')
      }
    };

    originalCachedData = getCachedData();
    setCachedData(mockData);

    await leetcodeCommand.autocomplete(mockInteraction);

    assert.strictEqual(mockInteraction.respond.mock.callCount(), 1);
    const response = mockInteraction.respond.mock.calls[0].arguments[0];
    assert.ok(Array.isArray(response));
    assert.ok(response.length <= 25); // Should limit to 25
  });

  test('should handle LeetcodeService errors gracefully', async () => {
    const mockData = {
      questions: [],
      topics: []
    };

    const mockInteraction = {
      deferReply: mock.fn(async () => {}),
      followUp: mock.fn(async () => {}),
      options: {
        getString: mock.fn(() => null)
      }
    };

    // Mock consola.error to suppress error logging during test
    const consolaMock = await import('consola');
    mock.method(consolaMock.default, 'error', () => {});

    mock.method(LeetcodeService, 'getRandomProblem', async () => {
      throw new Error('No problems found');
    });

    originalCachedData = getCachedData();
    setCachedData(mockData);

    await leetcodeCommand.execute(mockInteraction);

    assert.strictEqual(mockInteraction.deferReply.mock.callCount(), 1);
    assert.strictEqual(mockInteraction.followUp.mock.callCount(), 1);

    const followUpCall = mockInteraction.followUp.mock.calls[0];
    assert.ok(followUpCall.arguments[0].content.includes('Failed to fetch'));
  });

  test('should have cron scheduling functionality', () => {
    // Verify that the leetcode command module loads without errors with node-cron
    // This indirectly tests that node-cron is properly imported and doesn't cause issues
    assert.ok(leetcodeCommand);
    assert.ok(typeof leetcodeCommand.execute === 'function');
    assert.ok(typeof leetcodeCommand.autocomplete === 'function');
  });

  test('should export updateLeetCodeData function', () => {
    assert.ok(typeof updateLeetCodeData === 'function');
  });

  test('should handle updateLeetCodeData function correctly', async () => {
    // Mock consola to avoid logs during testing
    const consolaMock = await import('consola');
    mock.method(consolaMock.default, 'info', () => {});
    mock.method(consolaMock.default, 'success', () => {});
    mock.method(consolaMock.default, 'error', () => {});

    // Mock the service methods
    const mockData = [
      {
        id: 1,
        title: 'Test',
        difficulty: 'EASY',
        paidOnly: false,
        topicTags: [],
        acRate: 0.5,
        titleSlug: 'test'
      }
    ];
    const mockLoadData = { questions: [], topics: [] };

    mock.method(LeetcodeService, 'downloadData', async () => mockData);
    mock.method(LeetcodeService, 'saveData', async () => {});
    mock.method(LeetcodeService, 'loadData', async () => mockLoadData);

    // Test the function
    await updateLeetCodeData();

    // Verify the methods were called
    assert.strictEqual(LeetcodeService.downloadData.mock.callCount(), 1);
    assert.strictEqual(LeetcodeService.saveData.mock.callCount(), 1);
    assert.strictEqual(LeetcodeService.loadData.mock.callCount(), 1);
  });
});
