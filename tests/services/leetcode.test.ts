import { expect, vi, it, describe, beforeEach, afterEach } from 'vitest';
import { downloadData, loadData, validateData, filterQuestions } from '~/services/leetcode';
import fs from 'node:fs/promises';

describe('leetcode', () => {
  beforeEach(() => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    fetchSpy.mockResolvedValue({
      ok: true,
      json(): unknown {
        return {
          data: {
            problemsetQuestionListV2: {
              questions: [
                {
                  difficulty: 'EASY',
                  id: 1,
                  paidOnly: false,
                  title: 'Two Sum',
                  titleSlug: 'two-sum',
                  topicTags: [
                    {
                      name: 'Array',
                      slug: 'array'
                    },
                    {
                      name: 'Hash Table',
                      slug: 'hash-table'
                    }
                  ],
                  acRate: 0.5593718750815264
                },
                {
                  difficulty: 'MEDIUM',
                  id: 2,
                  paidOnly: false,
                  title: 'Add Two Numbers',
                  titleSlug: 'add-two-numbers',
                  topicTags: [
                    {
                      name: 'Linked List',
                      slug: 'linked-list'
                    },
                    {
                      name: 'Math',
                      slug: 'math'
                    },
                    {
                      name: 'Recursion',
                      slug: 'recursion'
                    }
                  ],
                  acRate: 0.46445458161815417
                },
                {
                  difficulty: 'MEDIUM',
                  id: 3,
                  paidOnly: false,
                  title: 'Longest Substring Without Repeating Characters',
                  titleSlug: 'longest-substring-without-repeating-characters',
                  topicTags: [
                    {
                      name: 'Hash Table',
                      slug: 'hash-table'
                    },
                    {
                      name: 'String',
                      slug: 'string'
                    },
                    {
                      name: 'Sliding Window',
                      slug: 'sliding-window'
                    }
                  ],
                  acRate: 0.37124450264662995
                }
              ]
            }
          }
        } as LeetCodeResponse;
      }
    } as Response);

    vi.mock('node:fs/promises', () => {
      return {
        default: {
          mkdir: vi.fn(),
          writeFile: vi.fn(),
          readFile: vi.fn()
        }
      };
    });
    vi.mock('~/services/leetcode', { spy: true });
    vi.mock('node:process', () => {
      return {
        default: {
          cwd: vi.fn(() => '/mocked/path')
        }
      };
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('downloadData', () => {
    it('should download and save cache successfully', async () => {
      await downloadData();
      expect(downloadData).toHaveResolved();
    });

    it('should throw error if the response not ok', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 502
      } as Response);

      await expect(downloadData()).rejects.toThrowErrorMatchingSnapshot();
    });

    it('should throw error if the responsed json not valid', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json(): unknown {
          return {
            data: {
              problemsetQuestionListV2: {
                questions: 'uwu'
              }
            }
          };
        }
      } as Response);

      await expect(downloadData()).rejects.toThrowErrorMatchingSnapshot();
    });

    it('should cache responsed json with custom structure', async () => {
      const mkdirSpy = vi.spyOn(fs, 'mkdir');
      const writeFileSpy = vi.spyOn(fs, 'writeFile');
      vi.setSystemTime(Date.UTC(2022, 0, 15, 17, 15, 20, 66));

      await downloadData();

      expect(mkdirSpy).toHaveBeenCalledOnce();
      expect(writeFileSpy).toHaveBeenCalledOnce();
      expect(mkdirSpy.mock.calls).toMatchSnapshot();
      expect(writeFileSpy.mock.calls).toMatchSnapshot();
    });
  });

  describe('loadData', () => {
    it('should return parsed data when cache file exists', async () => {
      const mockData = {
        metadata: { totalProblems: 1, lastUpdate: '2025-07-18' },
        problems: [],
        topics: []
      };
      vi.spyOn(fs, 'readFile').mockResolvedValueOnce(JSON.stringify(mockData));

      const result = await loadData();
      expect(result).toEqual(mockData);
    });

    it('should return null when reading cache fails', async () => {
      vi.spyOn(fs, 'readFile').mockRejectedValueOnce(new Error('File not found'));
      const result = await loadData();
      expect(result).toBeNull();
    });
  });

  describe('validateData', () => {
    it('should return true for valid data', async () => {
      const validData = {
        metadata: { totalProblems: 1, lastUpdate: '2025-07-18T00:00:00Z' },
        problems: [
          {
            id: 1,
            title: 'Two Sum',
            difficulty: 'easy',
            isPaid: false,
            acRate: 0.5,
            url: '',
            topics: ['Array']
          }
        ],
        topics: ['Array']
      };
      vi.spyOn(fs, 'readFile').mockResolvedValueOnce(JSON.stringify(validData));

      const result = await validateData();
      expect(result).toBe(true);
    });

    it('should return false if data is missing fields', async () => {
      const invalidData = { metadata: { totalProblems: 1 }, problems: [], topics: [] };
      vi.spyOn(fs, 'readFile').mockResolvedValueOnce(JSON.stringify(invalidData));

      const result = await validateData();
      expect(result).toBe(false);
    });

    it('should return false if file cannot be read', async () => {
      vi.spyOn(fs, 'readFile').mockRejectedValueOnce(new Error('File missing'));
      const result = await validateData();
      expect(result).toBe(false);
    });
  });

  describe('filterQuestions', () => {
    const mockData: LeetCodeData = {
      metadata: { totalProblems: 3, lastUpdate: '2025-07-18' },
      problems: [
        {
          id: 1,
          title: 'Two Sum',
          difficulty: 'easy',
          isPaid: false,
          acRate: 0.5,
          url: '',
          topics: ['Array']
        },
        {
          id: 2,
          title: 'Add Two Numbers',
          difficulty: 'medium',
          isPaid: true,
          acRate: 0.4,
          url: '',
          topics: ['Math']
        },
        {
          id: 3,
          title: 'Valid Parentheses',
          difficulty: 'easy',
          isPaid: false,
          acRate: 0.6,
          url: '',
          topics: ['Stack']
        }
      ],
      topics: ['Array', 'Math', 'Stack']
    };

    it('filters by difficulty and topic', () => {
      const result = filterQuestions(mockData, 'easy', 'array');
      expect(result).toMatchSnapshot();
    });

    it('excludes paid problems by default', () => {
      const result = filterQuestions(mockData, 'medium', 'math');
      expect(result).toMatchSnapshot();
    });

    it('includes paid problems when includePaid is true', () => {
      const result = filterQuestions(mockData, 'medium', 'math', true);
      expect(result).toMatchSnapshot();
    });
  });
});
