import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getImage, titles, categories } from '~/services/waifu';

describe('getImage', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json(): unknown {
        return { url: 'https://example.com.vn' };
      }
    } as Response);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should returns random image successfully', async () => {
    const { url, category, title } = await getImage();

    expect(global.fetch).toHaveBeenCalledOnce();
    expect(url).toBeTruthy();
    expect(categories).toContain(category);
    expect(titles).toContain(title);
  });

  it('should return a valid URL format', async () => {
    const { url } = await getImage();

    expect(url).toMatch(/^https:\/\/.+/);
  });

  it('should return consistent data structure', async () => {
    const result = await getImage();

    expect(result).toHaveProperty('url');
    expect(result).toHaveProperty('category');
    expect(result).toHaveProperty('title');
    expect(typeof result.url).toBe('string');
    expect(typeof result.category).toBe('string');
    expect(typeof result.title).toBe('string');
  });

  it('should exactly return image category if category param is defined', async () => {
    const { category } = await getImage('bite');

    expect(category).toBe('bite');
  });

  it('should throws an exception if the category is not available', async () => {
    await expect(getImage('123jjsasds')).rejects.toThrowError(
      'The 123jjsasds category is not valid'
    );
  });

  it('should throws an exception if the response is not ok', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404
    } as Response);

    await expect(getImage()).rejects.toThrowError(
      'The waifu.pics API is not available at the moment. Status code: 404'
    );
  });
});
