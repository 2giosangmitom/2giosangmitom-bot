/**
 * @file Unit tests for leetcode command
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 */

import { afterEach, beforeEach, describe, it, vi, expect } from 'vitest';
import leetcodeCommand from '~/commands/leetcode';
import type { MockAutoCompleteInteraction, MockChatInteraction, Problem } from '~/types';

describe('leetcode command', () => {
  let mockInteraction: MockChatInteraction;
  let mockAutoCompleteInteraction: MockAutoCompleteInteraction;

  beforeEach(() => {
    mockInteraction = {
      client: {
        leetcode: {
          isReady: vi.fn().mockReturnValue(true),
          pickRandomQuestion: vi.fn(),
          getTopics: vi.fn()
        }
      },
      options: {
        getString: vi.fn(),
        getBoolean: vi.fn()
      },
      deferReply: vi.fn(),
      followUp: vi.fn()
    } as MockChatInteraction;

    mockAutoCompleteInteraction = {
      options: {
        getFocused: vi.fn()
      },
      respond: vi.fn(),
      client: {
        leetcode: {
          isReady: vi.fn().mockReturnValue(true),
          pickRandomQuestion: vi.fn(),
          getTopics: vi.fn()
        }
      }
    } as MockAutoCompleteInteraction;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('execute', () => {
    it('should throw error if service is not ready', async () => {
      mockInteraction.client.leetcode.isReady.mockReturnValue(false);

      await expect(leetcodeCommand.execute(mockInteraction)).rejects.toThrow(
        'No problems found at the moment'
      );
    });

    it('should throw error if no problem matches', async () => {
      mockInteraction.client.leetcode.pickRandomQuestion.mockReturnValue(undefined);

      await expect(leetcodeCommand.execute(mockInteraction)).rejects.toThrow(
        'No problems match your preference.'
      );
    });

    it('should reply with an embed when a problem is found', async () => {
      const problem: Problem = {
        id: 1,
        title: 'Two Sum',
        url: 'https://leetcode.com/problems/two-sum',
        difficulty: 'easy',
        acRate: 0.5,
        isPaid: false,
        topics: ['Array', 'Hash Table']
      };
      vi.setSystemTime(Date.UTC(2022, 0, 15, 17, 15, 20, 66));
      mockInteraction.client.leetcode.pickRandomQuestion.mockReturnValue(problem);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'difficulty') return 'Easy';
        if (name === 'topic') return 'Array';
        return null;
      });
      mockInteraction.options.getBoolean.mockReturnValue(false);

      await leetcodeCommand.execute(mockInteraction);

      expect(mockInteraction.client.leetcode.pickRandomQuestion).toHaveBeenCalledWith(
        'Easy',
        'Array',
        false
      );
      expect(mockInteraction.deferReply).toHaveBeenCalledOnce();
      expect(mockInteraction.followUp).toHaveBeenCalledOnce();
      expect(mockInteraction.followUp.mock.calls[0]?.[0]).toMatchSnapshot();
    });
  });

  describe('autocomplete', () => {
    it('should throw error if service is not ready', async () => {
      mockAutoCompleteInteraction.client.leetcode.isReady.mockReturnValue(false);

      await expect(leetcodeCommand.autocomplete?.(mockAutoCompleteInteraction)).rejects.toThrow(
        'No problems found at the moment'
      );
    });

    it('should throw error if topics are not found', async () => {
      mockInteraction.client.leetcode.getTopics.mockReturnValue(undefined);
      mockAutoCompleteInteraction.options.getFocused.mockReturnValue('');

      await expect(leetcodeCommand.autocomplete?.(mockAutoCompleteInteraction)).rejects.toThrow(
        'No topics found at the moment'
      );
    });

    it('should return first 25 topics when no search term', async () => {
      const topics = Array.from({ length: 30 }, (_, i) => `Topic${i}`);
      mockAutoCompleteInteraction.client.leetcode.getTopics.mockReturnValue(topics);
      mockAutoCompleteInteraction.options.getFocused.mockReturnValue('');

      await leetcodeCommand.autocomplete?.(mockAutoCompleteInteraction);

      expect(mockAutoCompleteInteraction.respond).toHaveBeenCalledWith(
        topics.slice(0, 25).map((t) => ({ name: t, value: t }))
      );
    });

    it('should return fuse search results when search term provided', async () => {
      const topics = ['Array', 'Hash Table', 'Math'];
      mockAutoCompleteInteraction.client.leetcode.getTopics.mockReturnValue(topics);
      mockAutoCompleteInteraction.options.getFocused.mockReturnValue('Ha');

      await leetcodeCommand.autocomplete?.(mockAutoCompleteInteraction);

      expect(mockAutoCompleteInteraction.respond).toHaveBeenCalled();
      const callArg = mockAutoCompleteInteraction.respond.mock.calls[0]?.[0];
      expect(Array.isArray(callArg)).toBe(true);
    });
  });
});
