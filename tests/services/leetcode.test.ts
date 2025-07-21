import LeetCodeService from '~/services/leetcode';
import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import type { LeetCodeData } from '~/types';

describe('LeetCodeService', () => {
  describe('isReady', () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

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
});
