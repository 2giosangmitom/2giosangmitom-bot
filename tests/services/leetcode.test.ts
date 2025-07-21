import LeetCodeService from '~/services/leetcode';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import fs from 'node:fs';
import type { LeetCodeData } from '~/types';

// Mock global fetch to avoid hitting real API
beforeEach(() => {
  vi.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      data: {
        problemsetQuestionListV2: {
          questions: []
        }
      }
    })
  } as Response);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LeetCodeService', () => {
  describe('constructor', () => {
    it('downloads new data when cache not found', async () => {
      const downloadSpy = vi
        .spyOn(LeetCodeService.prototype, 'downloadData')
        .mockResolvedValueOnce({} as LeetCodeData);
      vi.spyOn(fs, 'existsSync').mockReturnValueOnce(false);

      const l = new LeetCodeService();
      expect(downloadSpy).toHaveBeenCalledOnce();

      await vi.waitFor(() => expect(l.isReady()).toBe(true));
    });

    it('downloads new data when cache found but not valid', async () => {
      const downloadSpy = vi
        .spyOn(LeetCodeService.prototype, 'downloadData')
        .mockResolvedValueOnce({} as LeetCodeData);
      const validateSpy = vi
        .spyOn(LeetCodeService.prototype, 'validateData')
        .mockReturnValueOnce(false);
      const existsSyncSpy = vi.spyOn(fs, 'existsSync').mockReturnValueOnce(true);

      const l = new LeetCodeService();
      expect(validateSpy).toHaveBeenCalledOnce();
      expect(downloadSpy).toHaveBeenCalledOnce();
      expect(existsSyncSpy).toHaveBeenCalledBefore(validateSpy);

      await vi.waitFor(() => expect(l.isReady()).toBe(true));
    });
  });

  describe('isReady', () => {
    it('returns true immediately when cache is valid', () => {
      const validData: LeetCodeData = {
        metadata: { totalProblems: 1, lastUpdate: '2025-07-21' },
        problems: [
          {
            id: 1,
            title: 'Two Sum',
            difficulty: 'easy',
            isPaid: false,
            acRate: 50,
            url: 'https://leetcode.com/problems/two-sum',
            topics: ['array']
          }
        ],
        topics: ['array']
      };

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(LeetCodeService.prototype, 'loadData').mockReturnValue(validData);
      vi.spyOn(LeetCodeService.prototype, 'validateData').mockReturnValue(true);

      const service = new LeetCodeService();
      expect(service.isReady()).toBe(true);
    });

    it('returns false initially when cache is invalid, then true after downloadData resolves', async () => {
      const mockData: LeetCodeData = {
        metadata: { totalProblems: 1, lastUpdate: new Date().toISOString() },
        problems: [],
        topics: []
      };

      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      vi.spyOn(LeetCodeService.prototype, 'loadData').mockReturnValue(null);
      vi.spyOn(LeetCodeService.prototype, 'validateData').mockReturnValue(false);
      const downloadSpy = vi
        .spyOn(LeetCodeService.prototype, 'downloadData')
        .mockResolvedValue(mockData);

      const service = new LeetCodeService();
      expect(service.isReady()).toBe(false);

      await vi.waitFor(() => expect(service.isReady()).toBe(true));
      expect(downloadSpy).toHaveBeenCalledOnce();
    });
  });

  describe('validateData', () => {
    it('returns true for valid data', () => {
      const validData: LeetCodeData = {
        metadata: {
          totalProblems: 3625,
          lastUpdate: '2025-07-21T00:47:01.065Z'
        },
        problems: [
          {
            id: 1,
            title: 'Two Sum',
            difficulty: 'easy',
            isPaid: false,
            acRate: 0.5595,
            url: 'https://leetcode.com/problems/two-sum',
            topics: ['Array', 'Hash Table']
          },
          {
            id: 2,
            title: 'Add Two Numbers',
            difficulty: 'medium',
            isPaid: false,
            acRate: 0.4646,
            url: 'https://leetcode.com/problems/add-two-numbers',
            topics: ['Linked List', 'Math', 'Recursion']
          }
        ],
        topics: ['Array', 'String']
      };

      expect(LeetCodeService.prototype.validateData(validData)).toBe(true);
    });

    it('returns false if data is null or not an object', () => {
      expect(LeetCodeService.prototype.validateData(null)).toBe(false);
      expect(LeetCodeService.prototype.validateData(undefined)).toBe(false);
      expect(LeetCodeService.prototype.validateData('string')).toBe(false);
    });

    it('returns false if required top-level keys are missing', () => {
      expect(LeetCodeService.prototype.validateData({})).toBe(false);
      expect(
        LeetCodeService.prototype.validateData({
          metadata: { totalProblems: 1, lastUpdate: new Date().toISOString() }
        })
      ).toBe(false);
    });

    it('returns false if metadata is invalid', () => {
      const invalidData = {
        metadata: { totalProblems: 'not-a-number', lastUpdate: new Date().toISOString() },
        problems: [],
        topics: []
      };
      expect(LeetCodeService.prototype.validateData(invalidData)).toBe(false);
    });

    it('returns false if problems array has invalid structure', () => {
      const invalidData = {
        metadata: { totalProblems: 1, lastUpdate: new Date().toISOString() },
        problems: [{ id: '1', title: 'Broken Problem' }],
        topics: []
      };
      expect(LeetCodeService.prototype.validateData(invalidData)).toBe(false);
    });
  });

  describe('loadData', () => {
    it('returns parsed JSON when cache file exists and is valid', () => {
      const fakeData = { hello: 'world' };
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(fakeData));

      const data = LeetCodeService.prototype.loadData();
      expect(data).toEqual(fakeData);
      expect(fs.readFileSync).toHaveBeenCalledOnce();
    });

    it('returns null when file does not exist', () => {
      vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('File not found');
      });

      const data = LeetCodeService.prototype.loadData();
      expect(data).toBeNull();
    });

    it('returns null when file content is invalid JSON', () => {
      vi.spyOn(fs, 'readFileSync').mockReturnValue('invalid-json');
      const data = LeetCodeService.prototype.loadData();
      expect(data).toBeNull();
    });
  });

  describe('filterQuestions', () => {
    const leetcodeObj = {
      data: {
        metadata: { totalProblems: 3, lastUpdate: new Date().toISOString() },
        problems: [
          {
            id: 1,
            title: 'Two Sum',
            difficulty: 'easy',
            isPaid: false,
            acRate: 50,
            url: 'https://leetcode.com/problems/two-sum',
            topics: ['Array', 'Hash Table']
          },
          {
            id: 2,
            title: 'Add Two Numbers',
            difficulty: 'medium',
            isPaid: true,
            acRate: 40,
            url: 'https://leetcode.com/problems/add-two-numbers',
            topics: ['Linked List', 'Math']
          },
          {
            id: 3,
            title: 'LRU Cache',
            difficulty: 'hard',
            isPaid: false,
            acRate: 35,
            url: 'https://leetcode.com/problems/lru-cache',
            topics: ['Design', 'Hash Table']
          }
        ],
        topics: ['Array', 'Hash Table', 'Linked List', 'Math', 'Design']
      }
    };

    it('returns all problems except paid-only if no filters provided', () => {
      const result = LeetCodeService.prototype.filterQuestions.call(leetcodeObj);
      expect(result).toHaveLength(2);
      expect(result).toMatchSnapshot();
    });

    it('filters by difficulty', () => {
      const result = LeetCodeService.prototype.filterQuestions.call(leetcodeObj, 'Easy');
      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe('Two Sum');
    });

    it('filters by topic (case-insensitive)', () => {
      const result = LeetCodeService.prototype.filterQuestions.call(
        leetcodeObj,
        undefined,
        'mAth',
        true
      );
      expect(result).toHaveLength(1);
      expect(result).toMatchSnapshot();
    });

    it('excludes paid problems when includePaid = false', () => {
      const result = LeetCodeService.prototype.filterQuestions.call(leetcodeObj);
      expect(result.find((p) => p.isPaid)).toBeUndefined();
    });

    it('includes paid problems when includePaid = true', () => {
      const result = LeetCodeService.prototype.filterQuestions.call(
        leetcodeObj,
        undefined,
        undefined,
        true
      );
      expect(result.find((p) => p.title === 'Add Two Numbers')).toBeDefined();
    });

    it('applies all filters together', () => {
      const result = LeetCodeService.prototype.filterQuestions.call(
        leetcodeObj,
        'Medium',
        'Math',
        true
      );
      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe('Add Two Numbers');
    });
  });
});
