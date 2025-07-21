import LeetCodeService from '~/services/leetcode';
import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import type { LeetCodeData } from '~/types';

describe('LeetCodeService', () => {
  describe('constructor', () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

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
