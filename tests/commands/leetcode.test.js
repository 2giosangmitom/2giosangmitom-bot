import { expect, it, describe, vi, beforeEach } from 'vitest';
import { execute, autocomplete } from '../../src/commands/leetcode.js';

// Mock the services and utils
vi.mock('../../src/services/leetcode.js', () => ({
  filterQuestions: vi.fn(),
  loadData: vi.fn()
}));

vi.mock('../../src/lib/utils.js', () => ({
  randomFrom: vi.fn()
}));

vi.mock('fuse.js', () => ({
  default: vi.fn()
}));

import { filterQuestions, loadData } from '../../src/services/leetcode.js';
import { randomFrom } from '../../src/lib/utils.js';
import Fuse from 'fuse.js';

describe('leetcode command', () => {
  let mockInteraction;
  let mockLeetCodeData;

  beforeEach(() => {
    vi.resetAllMocks();

    mockLeetCodeData = {
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

    mockInteraction = {
      options: {
        getString: vi.fn(),
        getBoolean: vi.fn()
      },
      reply: vi.fn()
    };
  });

  describe('execute', () => {
    it('should successfully return a random problem with default parameters', async () => {
      const mockProblem = mockLeetCodeData.problems[0];

      loadData.mockResolvedValueOnce(mockLeetCodeData);
      randomFrom
        .mockReturnValueOnce('Easy') // for difficulty
        .mockReturnValueOnce('Array') // for topic
        .mockReturnValueOnce(mockProblem); // for filtered problems

      mockInteraction.options.getString
        .mockReturnValueOnce(null) // difficulty
        .mockReturnValueOnce(null); // topic
      mockInteraction.options.getBoolean.mockReturnValueOnce(null); // include-paid

      filterQuestions.mockReturnValueOnce([mockProblem]);
      mockInteraction.reply.mockResolvedValueOnce();

      await execute(mockInteraction);

      expect(loadData).toHaveBeenCalled();
      expect(randomFrom).toHaveBeenCalledTimes(3);
      expect(filterQuestions).toHaveBeenCalledWith(mockLeetCodeData.problems, 'easy', 'array', false);
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        embeds: [
          expect.objectContaining({
            data: expect.objectContaining({
              title: 'Two Sum',
              url: 'https://leetcode.com/problems/two-sum',
              color: 5763719, // 'Green' color
              fields: expect.arrayContaining([
                expect.objectContaining({
                  name: 'Acceptance Rate',
                  value: '51.23%'
                }),
                expect.objectContaining({
                  name: 'Paid Only',
                  value: '❌ No'
                }),
                expect.objectContaining({
                  name: 'Topics',
                  value: 'Array, Hash Table'
                })
              ])
            })
          })
        ]
      });
    });

    it('should use user-specified parameters', async () => {
      const mockProblem = mockLeetCodeData.problems[1];

      loadData.mockResolvedValueOnce(mockLeetCodeData);
      randomFrom.mockReturnValueOnce(mockProblem);

      mockInteraction.options.getString
        .mockReturnValueOnce('Medium') // difficulty
        .mockReturnValueOnce('Linked List'); // topic
      mockInteraction.options.getBoolean.mockReturnValueOnce(true); // include-paid

      filterQuestions.mockReturnValueOnce([mockProblem]);
      mockInteraction.reply.mockResolvedValueOnce();

      await execute(mockInteraction);

      expect(filterQuestions).toHaveBeenCalledWith(mockLeetCodeData.problems, 'medium', 'linked list', true);
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        embeds: [
          expect.objectContaining({
            data: expect.objectContaining({
              title: 'Add Two Numbers',
              color: 16776960, // 'Yellow' color for medium
              fields: expect.arrayContaining([
                expect.objectContaining({
                  name: 'Paid Only',
                  value: '✅ Yes'
                })
              ])
            })
          })
        ]
      });
    });

    it('should handle no LeetCode data available', async () => {
      loadData.mockResolvedValueOnce(null);

      await expect(execute(mockInteraction)).rejects.toThrow('No problems found at the moment');
    });

    it('should handle no filtered problems found', async () => {
      loadData.mockResolvedValueOnce(mockLeetCodeData);
      randomFrom.mockReturnValueOnce('Hard').mockReturnValueOnce('Dynamic Programming');

      mockInteraction.options.getString.mockReturnValueOnce(null).mockReturnValueOnce(null);
      mockInteraction.options.getBoolean.mockReturnValueOnce(null);

      filterQuestions.mockReturnValueOnce([]);
      mockInteraction.reply.mockResolvedValueOnce();

      await execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining('No problems found matching the criteria'),
        flags: 64 // MessageFlags.Ephemeral
      });
    });

    it('should handle randomFrom returning null for problem selection', async () => {
      loadData.mockResolvedValueOnce(mockLeetCodeData);
      randomFrom.mockReturnValueOnce('Easy').mockReturnValueOnce('Array').mockReturnValueOnce(null); // No problem selected

      mockInteraction.options.getString.mockReturnValueOnce(null).mockReturnValueOnce(null);
      mockInteraction.options.getBoolean.mockReturnValueOnce(null);

      filterQuestions.mockReturnValueOnce([mockLeetCodeData.problems[0]]);

      await expect(execute(mockInteraction)).rejects.toThrow('No problems match your preference');
    });

    it('should handle missing parameters gracefully', async () => {
      loadData.mockResolvedValueOnce(mockLeetCodeData);
      randomFrom.mockReturnValueOnce(null); // randomFrom returns null

      mockInteraction.options.getString.mockReturnValueOnce(null).mockReturnValueOnce(null);
      mockInteraction.options.getBoolean.mockReturnValueOnce(null);

      await expect(execute(mockInteraction)).rejects.toThrow('An error occurred while reading parameters');
    });

    it('should set correct embed colors for different difficulties', async () => {
      const testCases = [
        { difficulty: 'easy', expectedColor: 5763719 }, // Green
        { difficulty: 'medium', expectedColor: 16776960 }, // Yellow
        { difficulty: 'hard', expectedColor: 15548997 } // Red
      ];

      for (const testCase of testCases) {
        const mockProblem = {
          ...mockLeetCodeData.problems[0],
          difficulty: testCase.difficulty
        };

        loadData.mockResolvedValueOnce(mockLeetCodeData);
        randomFrom.mockReturnValueOnce(mockProblem);
        filterQuestions.mockReturnValueOnce([mockProblem]);
        mockInteraction.reply.mockResolvedValueOnce();

        mockInteraction.options.getString.mockReturnValueOnce(testCase.difficulty).mockReturnValueOnce('Array');
        mockInteraction.options.getBoolean.mockReturnValueOnce(false);

        await execute(mockInteraction);

        expect(mockInteraction.reply).toHaveBeenCalledWith({
          embeds: [
            expect.objectContaining({
              data: expect.objectContaining({
                color: testCase.expectedColor
              })
            })
          ]
        });

        vi.clearAllMocks();
      }
    });
  });

  describe('autocomplete', () => {
    let mockAutocompleteInteraction;
    let mockFuse;

    beforeEach(() => {
      mockAutocompleteInteraction = {
        options: {
          getFocused: vi.fn()
        },
        respond: vi.fn()
      };

      mockFuse = {
        search: vi.fn()
      };

      Fuse.mockImplementation(() => mockFuse);
    });

    it('should return search results for topic autocomplete', async () => {
      loadData.mockResolvedValueOnce(mockLeetCodeData);
      mockAutocompleteInteraction.options.getFocused.mockReturnValueOnce('arr');

      mockFuse.search.mockReturnValueOnce([
        { item: 'Array', score: 0.1 },
        { item: 'Binary Search', score: 0.3 }
      ]);

      mockAutocompleteInteraction.respond.mockResolvedValueOnce();

      await autocomplete(mockAutocompleteInteraction);

      expect(Fuse).toHaveBeenCalledWith(
        mockLeetCodeData.topics,
        expect.objectContaining({
          includeScore: true,
          threshold: 0.3
        })
      );
      expect(mockFuse.search).toHaveBeenCalledWith('arr', { limit: 25 });
      expect(mockAutocompleteInteraction.respond).toHaveBeenCalledWith([
        { name: 'Array', value: 'Array' },
        { name: 'Binary Search', value: 'Binary Search' }
      ]);
    });

    it('should return first 25 topics when no search term provided', async () => {
      const topics = Array.from({ length: 30 }, (_, i) => `Topic ${i + 1}`);
      const leetCodeDataWithManyTopics = { ...mockLeetCodeData, topics };

      loadData.mockResolvedValueOnce(leetCodeDataWithManyTopics);
      mockAutocompleteInteraction.options.getFocused.mockReturnValueOnce('');
      mockAutocompleteInteraction.respond.mockResolvedValueOnce();

      await autocomplete(mockAutocompleteInteraction);

      expect(mockAutocompleteInteraction.respond).toHaveBeenCalledWith(
        topics.slice(0, 25).map((topic) => ({ name: topic, value: topic }))
      );
      expect(mockFuse.search).not.toHaveBeenCalled();
    });

    it('should handle empty search results gracefully', async () => {
      loadData.mockResolvedValueOnce(mockLeetCodeData);
      mockAutocompleteInteraction.options.getFocused.mockReturnValueOnce('xyz');

      mockFuse.search.mockReturnValueOnce([]);
      mockAutocompleteInteraction.respond.mockResolvedValueOnce();

      await autocomplete(mockAutocompleteInteraction);

      expect(mockAutocompleteInteraction.respond).toHaveBeenCalledWith([]);
    });

    it('should handle no LeetCode data in autocomplete', async () => {
      loadData.mockResolvedValueOnce(null);

      await expect(autocomplete(mockAutocompleteInteraction)).rejects.toThrow('No problems found at the moment');
    });

    it('should handle whitespace-only search terms', async () => {
      loadData.mockResolvedValueOnce(mockLeetCodeData);
      mockAutocompleteInteraction.options.getFocused.mockReturnValueOnce('   ');
      mockAutocompleteInteraction.respond.mockResolvedValueOnce();

      await autocomplete(mockAutocompleteInteraction);

      expect(mockAutocompleteInteraction.respond).toHaveBeenCalledWith(
        mockLeetCodeData.topics.slice(0, 25).map((topic) => ({ name: topic, value: topic }))
      );
      expect(mockFuse.search).not.toHaveBeenCalled();
    });
  });
});
