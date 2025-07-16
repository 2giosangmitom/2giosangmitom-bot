import { expect, it, describe, vi, beforeEach } from 'vitest';
import { getImage, categories } from '../../src/services/waifu.js';

// Mock the fetch function
global.fetch = vi.fn();

describe('waifu service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getImage', () => {
    it('should return image data with valid category', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ url: 'https://example.com/waifu.jpg' })
      };

      fetch.mockResolvedValueOnce(mockResponse);

      const result = await getImage('waifu');

      expect(result).toEqual({
        url: 'https://example.com/waifu.jpg',
        category: 'waifu'
      });
      expect(fetch).toHaveBeenCalledWith('https://api.waifu.pics/sfw/waifu');
    });

    it('should use random category when none provided', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ url: 'https://example.com/random.jpg' })
      };

      fetch.mockResolvedValueOnce(mockResponse);

      const result = await getImage();

      expect(categories).toContain(result.category);
      expect(result.url).toBe('https://example.com/random.jpg');
    });

    it('should throw error for invalid category', async () => {
      await expect(getImage('invalid-category')).rejects.toThrow('The requested category is not available');

      expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle API request failure', async () => {
      const mockResponse = {
        ok: false,
        status: 500
      };

      fetch.mockResolvedValueOnce(mockResponse);

      await expect(getImage('waifu')).rejects.toThrow('Request Failed. Status Code: 500');
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(getImage('waifu')).rejects.toThrow('Network error');
    });

    it('should handle invalid API response', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({}) // Missing url field
      };

      fetch.mockResolvedValueOnce(mockResponse);

      await expect(getImage('waifu')).rejects.toThrow('Invalid response from waifu.pics API');
    });

    it('should handle malformed JSON response', async () => {
      const mockResponse = {
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      };

      fetch.mockResolvedValueOnce(mockResponse);

      await expect(getImage('waifu')).rejects.toThrow('Invalid JSON');
    });

    it('should work with all valid categories', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ url: 'https://example.com/test.jpg' })
      };

      for (const category of categories) {
        fetch.mockResolvedValueOnce(mockResponse);

        const result = await getImage(category);

        expect(result.category).toBe(category);
        expect(result.url).toBe('https://example.com/test.jpg');
      }
    });

    it('should handle case insensitive categories', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ url: 'https://example.com/test.jpg' })
      };

      fetch.mockResolvedValueOnce(mockResponse);

      const result = await getImage('WAIFU');

      expect(result.category).toBe('WAIFU');
      expect(fetch).toHaveBeenCalledWith('https://api.waifu.pics/sfw/WAIFU');
    });
  });

  describe('categories export', () => {
    it('should export valid categories array', () => {
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
      expect(categories).toContain('waifu');
      expect(categories).toContain('hug');
      expect(categories).toContain('kiss');
    });

    it('should not contain duplicate categories', () => {
      const uniqueCategories = [...new Set(categories)];
      expect(uniqueCategories).toEqual(categories);
    });

    it('should only contain valid string categories', () => {
      categories.forEach((category) => {
        expect(typeof category).toBe('string');
        expect(category.length).toBeGreaterThan(0);
      });
    });
  });
});
