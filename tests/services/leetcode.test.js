import { expect, it, describe, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { downloadData, loadData, validateData, filterQuestions, initializeData } from '../../src/services/leetcode.js';

// Mock node modules
vi.mock('node:fs/promises');
vi.mock('node:process', () => ({
  default: {
    cwd: () => '/test/path'
  }
}));

// Mock fetch
global.fetch = vi.fn();

describe('leetcode service', () => {
  const mockCachePath = path.join('/test/path', '.cache', 'data.json');

  const mockLeetCodeResponse = {
    data: {
      problemsetQuestionListV2: {
        questions: [
          {
            id: '1',
            title: 'Two Sum',
            titleSlug: 'two-sum',
            difficulty: 'Easy',
            paidOnly: false,
            acRate: 0.5123,
            topicTags: [
              { name: 'Array', slug: 'array' },
              { name: 'Hash Table', slug: 'hash-table' }
            ]
          },
          {
            id: '2',
            title: 'Add Two Numbers',
            titleSlug: 'add-two-numbers',
            difficulty: 'Medium',
            paidOnly: true,
            acRate: 0.4567,
            topicTags: [{ name: 'Linked List', slug: 'linked-list' }]
          }
        ]
      }
    }
  };

  const mockCachedData = {
    metadata: {
      totalProblems: 2,
      lastUpdate: '2025-01-01T00:00:00.000Z'
    },
    problems: [
      {
        id: '1',
        title: 'Two Sum',
        difficulty: 'easy',
        isPaid: false,
        acRate: 0.5123,
        url: 'https://leetcode.com/problems/two-sum',
        topics: ['Array', 'Hash Table']
      },
      {
        id: '2',
        title: 'Add Two Numbers',
        difficulty: 'medium',
        isPaid: true,
        acRate: 0.4567,
        url: 'https://leetcode.com/problems/add-two-numbers',
        topics: ['Linked List']
      }
    ],
    topics: ['Array', 'Hash Table', 'Linked List']
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('downloadData', () => {
    it('should successfully download and cache LeetCode data', async () => {
      const mockResponse = {
        ok: true,
        json: async () => mockLeetCodeResponse
      };

      fetch.mockResolvedValueOnce(mockResponse);
      fs.mkdir.mockResolvedValueOnce();
      fs.writeFile.mockResolvedValueOnce();

      await downloadData();

      expect(fetch).toHaveBeenCalledWith(
        'https://leetcode.com/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );

      expect(fs.mkdir).toHaveBeenCalledWith(path.dirname(mockCachePath), { recursive: true });

      expect(fs.writeFile).toHaveBeenCalledWith(mockCachePath, expect.stringContaining('"title":"Two Sum"'), 'utf-8');
    });

    it('should throw error for failed API request', async () => {
      const mockResponse = {
        ok: false,
        status: 500
      };

      fetch.mockResolvedValueOnce(mockResponse);

      await expect(downloadData()).rejects.toThrow('Request failed. Status Code: 500');
    });

    it('should throw error for invalid response structure', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ data: { invalid: 'structure' } })
      };

      fetch.mockResolvedValueOnce(mockResponse);

      await expect(downloadData()).rejects.toThrow('Invalid response structure from LeetCode API');
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(downloadData()).rejects.toThrow('Network error');
    });
  });

  describe('loadData', () => {
    it('should successfully load cached data', async () => {
      fs.readFile.mockResolvedValueOnce(JSON.stringify(mockCachedData));

      const result = await loadData();

      expect(result).toEqual(mockCachedData);
      expect(fs.readFile).toHaveBeenCalledWith(mockCachePath, 'utf-8');
    });

    it('should return null for non-existent cache file', async () => {
      fs.readFile.mockRejectedValueOnce(new Error('ENOENT: file not found'));

      const result = await loadData();

      expect(result).toBe(null);
    });

    it('should return null for invalid JSON', async () => {
      fs.readFile.mockResolvedValueOnce('invalid json');

      const result = await loadData();

      expect(result).toBe(null);
    });
  });

  describe('validateData', () => {
    it('should return true for valid cached data', async () => {
      fs.readFile.mockResolvedValueOnce(JSON.stringify(mockCachedData));

      const result = await validateData();

      expect(result).toBe(true);
    });

    it('should return false for missing cache file', async () => {
      fs.readFile.mockRejectedValueOnce(new Error('ENOENT'));

      const result = await validateData();

      expect(result).toBe(false);
    });

    it('should return false for invalid data structure', async () => {
      const invalidData = {
        metadata: { totalProblems: 'invalid' }, // should be number
        problems: [],
        topics: []
      };

      fs.readFile.mockResolvedValueOnce(JSON.stringify(invalidData));

      const result = await validateData();

      expect(result).toBe(false);
    });

    it('should return false for missing required fields', async () => {
      const incompleteData = {
        metadata: {
          totalProblems: 1,
          lastUpdate: '2025-01-01T00:00:00.000Z'
        },
        problems: [
          {
            id: '1',
            title: 'Test'
            // missing other required fields
          }
        ],
        topics: []
      };

      fs.readFile.mockResolvedValueOnce(JSON.stringify(incompleteData));

      const result = await validateData();

      expect(result).toBe(false);
    });
  });

  describe('filterQuestions', () => {
    const problems = mockCachedData.problems;

    it('should filter by difficulty correctly', () => {
      const easy = filterQuestions(problems, 'easy', 'array', false);
      expect(easy).toHaveLength(1);
      expect(easy[0].difficulty).toBe('easy');

      const medium = filterQuestions(problems, 'medium', 'linked list', false);
      expect(medium).toHaveLength(0); // paid problem excluded

      const mediumWithPaid = filterQuestions(problems, 'medium', 'linked list', true);
      expect(mediumWithPaid).toHaveLength(1);
    });

    it('should filter by topic correctly', () => {
      const arrayProblems = filterQuestions(problems, 'easy', 'array', false);
      expect(arrayProblems).toHaveLength(1);
      expect(arrayProblems[0].topics).toContain('Array');

      const linkedListProblems = filterQuestions(problems, 'medium', 'linked list', true);
      expect(linkedListProblems).toHaveLength(1);
      expect(linkedListProblems[0].topics).toContain('Linked List');
    });

    it('should handle case insensitive filtering', () => {
      const result1 = filterQuestions(problems, 'EASY', 'ARRAY', false);
      const result2 = filterQuestions(problems, 'easy', 'array', false);

      expect(result1).toEqual(result2);
    });

    it('should exclude paid problems when includePaid is false', () => {
      const freeOnly = filterQuestions(problems, 'medium', 'linked list', false);
      expect(freeOnly).toHaveLength(0);

      const withPaid = filterQuestions(problems, 'medium', 'linked list', true);
      expect(withPaid).toHaveLength(1);
    });

    it('should return empty array for no matches', () => {
      const result = filterQuestions(problems, 'hard', 'dynamic programming', false);
      expect(result).toEqual([]);
    });

    it('should handle empty problems array', () => {
      const result = filterQuestions([], 'easy', 'array', false);
      expect(result).toEqual([]);
    });
  });

  describe('initializeData', () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    beforeEach(() => {
      mockLogger.info.mockClear();
      mockLogger.warn.mockClear();
      mockLogger.error.mockClear();
    });

    it('should use existing valid cache', async () => {
      fs.access.mockResolvedValueOnce(); // File exists
      fs.readFile.mockResolvedValueOnce(JSON.stringify(mockCachedData));

      await initializeData(mockLogger);

      expect(mockLogger.info).toHaveBeenCalledWith('Found existing cache file.');
      expect(mockLogger.info).toHaveBeenCalledWith('Cache is valid. No need to re-fetch.');
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should re-download when cache is invalid', async () => {
      fs.access.mockResolvedValueOnce(); // File exists
      fs.readFile.mockResolvedValueOnce('invalid data');

      // Mock successful download
      const mockResponse = {
        ok: true,
        json: async () => mockLeetCodeResponse
      };
      fetch.mockResolvedValueOnce(mockResponse);
      fs.mkdir.mockResolvedValueOnce();
      fs.writeFile.mockResolvedValueOnce();

      await initializeData(mockLogger);

      expect(mockLogger.warn).toHaveBeenCalledWith('Cache is invalid. Re-downloading data...');
      expect(mockLogger.info).toHaveBeenCalledWith('LeetCode data downloaded and cached.');
      expect(fetch).toHaveBeenCalled();
    });

    it('should download when cache file does not exist', async () => {
      fs.access.mockRejectedValueOnce(new Error('ENOENT'));

      // Mock successful download
      const mockResponse = {
        ok: true,
        json: async () => mockLeetCodeResponse
      };
      fetch.mockResolvedValueOnce(mockResponse);
      fs.mkdir.mockResolvedValueOnce();
      fs.writeFile.mockResolvedValueOnce();

      await initializeData(mockLogger);

      expect(mockLogger.warn).toHaveBeenCalledWith('Cache file not found. Fetching data from LeetCode...');
      expect(mockLogger.info).toHaveBeenCalledWith('LeetCode data downloaded and cached.');
    });

    it('should handle download errors gracefully', async () => {
      fs.access.mockRejectedValueOnce(new Error('ENOENT'));
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await initializeData(mockLogger);

      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
