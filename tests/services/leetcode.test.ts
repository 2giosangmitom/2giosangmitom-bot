/**
 * @file Unit tests for leetcode service
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 */

import LeetCodeService from '~/services/leetcode';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'discord.js';
import pino from 'pino';
import type { LeetCodeData } from '~/types';
import { randomFrom } from '~/lib/utils';

vi.mock('~/lib/utils', () => ({
  randomFrom: vi.fn((arr) => arr[0]) // deterministic mock
}));

describe('LeetCodeService', () => {
  let client: Client;

  beforeEach(() => {
    client = new Client({ intents: [] });
    client.log = vi.mockObject(pino());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('downloads new data when cache not found', async () => {
      const downloadSpy = vi
        .spyOn(LeetCodeService.prototype, 'downloadData')
        .mockResolvedValueOnce({} as LeetCodeData);
      vi.spyOn(fs, 'existsSync').mockReturnValueOnce(false);

      const l = new LeetCodeService(client);

      expect(downloadSpy).toHaveBeenCalledOnce();
      await vi.waitFor(() => {
        expect(l.isReady()).toBe(true);
      });
    });

    it('downloads new data when cache found but not valid', async () => {
      const downloadSpy = vi
        .spyOn(LeetCodeService.prototype, 'downloadData')
        .mockResolvedValueOnce({} as LeetCodeData);
      const validateSpy = vi
        .spyOn(LeetCodeService.prototype, 'validateData')
        .mockReturnValueOnce(false);
      const existsSyncSpy = vi.spyOn(fs, 'existsSync').mockReturnValueOnce(true);

      const l = new LeetCodeService(client);

      expect(validateSpy).toHaveBeenCalledOnce();
      expect(downloadSpy).toHaveBeenCalledOnce();
      expect(existsSyncSpy).toHaveBeenCalledBefore(validateSpy);
      await vi.waitFor(() => {
        expect(l.isReady()).toBe(true);
      });
    });
  });

  describe('isReady', () => {
    it('returns true immediately when cache is valid', () => {
      const validData: LeetCodeData = {
        metadata: { totalProblems: 1, lastUpdate: '2025-7-21' },
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

      const service = new LeetCodeService(client);
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

      const service = new LeetCodeService(client);
      expect(service.isReady()).toBe(false);

      await vi.waitFor(() => {
        expect(service.isReady()).toBe(true);
      });

      expect(downloadSpy).toHaveBeenCalledOnce();
    });
  });

  describe('downloadData', () => {
    it('rejects if response not ok', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 500 } as Response);
      const l = new LeetCodeService(client);

      await expect(l.downloadData()).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Request failed. Status Code: 500]`
      );
    });

    it('rejects if response json not valid', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ depzai: 'oidoioi' })
      } as Response);

      const l = new LeetCodeService(client);
      await expect(l.downloadData()).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Invalid response structure from LeetCode API]`
      );
    });

    it('writes cache to cachePath correctly', async () => {
      vi.spyOn(path, 'join').mockReturnValue('/cache/data.json');
      const mkdirSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
      const writeFileSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: {
              problemsetQuestionListV2: {
                questions: [
                  {
                    difficulty: 'EASY',
                    id: '1',
                    paidOnly: false,
                    title: 'Two Sum',
                    titleSlug: 'two-sum',
                    topicTags: [{ name: 'Array', slug: 'array' }],
                    acRate: 0.55
                  }
                ]
              }
            }
          })
      } as Response);

      const ctx: any = {};
      const result = await LeetCodeService.prototype.downloadData.call(ctx);

      expect(result).toMatchObject({
        metadata: { totalProblems: 1 },
        problems: expect.any(Array),
        topics: expect.any(Array)
      });
      expect(mkdirSpy).toHaveBeenCalledOnce();
      expect(writeFileSpy).toHaveBeenCalledOnce();
    });
  });

  describe('validateData', () => {
    const service = new LeetCodeService();

    it('returns true for valid data', () => {
      const validData: LeetCodeData = {
        metadata: { totalProblems: 2, lastUpdate: new Date().toISOString() },
        problems: [
          {
            id: 1,
            title: 'Two Sum',
            difficulty: 'easy',
            isPaid: false,
            acRate: 50,
            url: 'https://leetcode.com/problems/two-sum',
            topics: ['array']
          },
          {
            id: 2,
            title: 'Add Two Numbers',
            difficulty: 'medium',
            isPaid: false,
            acRate: 40,
            url: 'https://leetcode.com/problems/add-two-numbers',
            topics: ['linked-list']
          }
        ],
        topics: ['array', 'linked-list']
      };

      expect(service.validateData(validData)).toBe(true);
    });

    it('returns false if data is null or not an object', () => {
      expect(service.validateData(null)).toBe(false);
      expect(service.validateData(undefined)).toBe(false);
      expect(service.validateData('string')).toBe(false);
    });

    it('returns false if required top-level keys are missing', () => {
      expect(service.validateData({})).toBe(false);
      expect(
        service.validateData({
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
      expect(service.validateData(invalidData)).toBe(false);
    });

    it('returns false if problems array has invalid structure', () => {
      const invalidData = {
        metadata: { totalProblems: 1, lastUpdate: new Date().toISOString() },
        problems: [{ id: '1', title: 'Broken Problem' }],
        topics: []
      };
      expect(service.validateData(invalidData)).toBe(false);
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
    let service: LeetCodeService;

    beforeEach(() => {
      service = new LeetCodeService();
      (service as any).data = {
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
      };
    });

    it('returns all problems except paid-only if no filters provided', () => {
      const result = service.filterQuestions();
      expect(result).toHaveLength(2);
      expect(result).toMatchSnapshot();
    });

    it('filters by difficulty', () => {
      const result = service.filterQuestions('Easy');
      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe('Two Sum');
    });

    it('filters by topic (case-insensitive)', () => {
      const result = service.filterQuestions(undefined, 'mAth', true);
      expect(result).toHaveLength(1);
      expect(result).toMatchSnapshot();
    });

    it('excludes paid problems when includePaid = false', () => {
      const result = service.filterQuestions();
      expect(result.find((p) => p.isPaid)).toBeUndefined();
    });

    it('includes paid problems when includePaid = true', () => {
      const result = service.filterQuestions(undefined, undefined, true);
      expect(result.find((p) => p.title === 'Add Two Numbers')).toBeDefined();
    });

    it('applies all filters together', () => {
      const result = service.filterQuestions('Medium', 'Math', true);
      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe('Add Two Numbers');
    });
  });

  describe('pickRandomQuestion', () => {
    let service: LeetCodeService;

    beforeEach(() => {
      service = new LeetCodeService();
      (service as any).data = {
        metadata: { totalProblems: 2, lastUpdate: new Date().toISOString() },
        problems: [
          {
            id: 1,
            title: 'Two Sum',
            difficulty: 'easy',
            isPaid: false,
            acRate: 50,
            url: 'https://leetcode.com/problems/two-sum',
            topics: ['Array']
          },
          {
            id: 2,
            title: 'Add Two Numbers',
            difficulty: 'medium',
            isPaid: false,
            acRate: 40,
            url: 'https://leetcode.com/problems/add-two-numbers',
            topics: ['Linked List']
          }
        ],
        topics: ['Array', 'Linked List']
      };
    });

    it('returns undefined if no question matches filters', () => {
      const result = service.pickRandomQuestion('hard');
      expect(result).toBeUndefined();
    });

    it('uses randomFrom on filtered questions', () => {
      const mock = vi.mocked(randomFrom).mockReturnValue(service['data']!.problems[1]);
      const result = service.pickRandomQuestion('Medium');
      expect(mock).toHaveBeenCalledWith([service['data']!.problems[1]]);
      expect(result?.title).toBe('Add Two Numbers');
    });

    it('returns a question when filters match multiple', () => {
      const result = service.pickRandomQuestion(undefined, undefined, true);
      expect(result).toEqual(service['data']!.problems[0]); // deterministic mock
    });
  });
});
