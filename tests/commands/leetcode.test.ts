/**
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 * @license MIT
 * @copyright © 2025 Vo Quang Chien
 */

import { ChatInputCommandInteraction } from 'discord.js';
import { describe, vi, expect, beforeEach, afterEach, it } from 'vitest';
import { execute } from '~/commands/leetcode';
import * as leetcodeService from '~/services/leetcode';
import * as utils from '~/lib/utils';

describe('leetcode', () => {
  let mockInteraction: MockChatInteraction;

  beforeEach(() => {
    mockInteraction = {
      reply: vi.fn(),
      options: {
        getString: vi.fn((opt: string) => {
          if (opt === 'difficulty') {
            return 'Easy'; // Mock user input
          }
          return 'Array'; // Mock topic input
        }),
        getBoolean: vi.fn(() => null)
      }
    } as MockChatInteraction;

    vi.mock('~/services/leetcode', () => {
      return {
        loadData: vi.fn().mockResolvedValue(null),
        difficulties: ['Easy', 'Medium', 'Hard'],
        filterQuestions: vi.fn()
      };
    });
    vi.mock('~/commands/leetcode', { spy: true });
    vi.setSystemTime(Date.UTC(2025, 0, 1, 0, 0, 0, 0));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('execute', () => {
    it('should throws error if data not ready', async () => {
      vi.spyOn(leetcodeService, 'loadData').mockResolvedValueOnce(null);

      await expect(
        execute(mockInteraction as unknown as ChatInputCommandInteraction)
      ).rejects.toThrowErrorMatchingSnapshot();
    });

    it('should throws error if no problems match preference', async () => {
      // Make it don't return null
      vi.spyOn(leetcodeService, 'loadData').mockResolvedValueOnce({} as LeetCodeData);

      vi.spyOn(utils, 'randomFrom').mockReturnValueOnce(null);

      await expect(
        execute(mockInteraction as unknown as ChatInputCommandInteraction)
      ).rejects.toThrowErrorMatchingSnapshot();
    });

    it('should reply to user if data is ready', async () => {
      const problems = [
        {
          id: 1,
          title: 'Two Sum',
          difficulty: 'easy',
          isPaid: false,
          acRate: 0.5593718750815264,
          url: 'https://leetcode.com/problems/two-sum',
          topics: ['Array', 'Hash Table']
        },
        {
          id: 2,
          title: 'Add Two Numbers',
          difficulty: 'medium',
          isPaid: false,
          acRate: 0.46445458161815417,
          url: 'https://leetcode.com/problems/add-two-numbers',
          topics: ['Linked List', 'Math', 'Recursion']
        }
      ];
      vi.spyOn(leetcodeService, 'loadData').mockResolvedValueOnce({
        metadata: {
          totalProblems: 3617,
          lastUpdate: '2025-07-18T08:24:59.405Z'
        },
        problems
      } as LeetCodeData);

      vi.spyOn(utils, 'randomFrom').mockReturnValueOnce(problems[0]);
      await execute(mockInteraction as unknown as ChatInputCommandInteraction);
      expect(mockInteraction.reply.mock.calls).toMatchSnapshot();
    });
  });
});
