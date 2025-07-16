import { expect, it, describe, vi, beforeEach } from 'vitest';
import { execute } from '../../src/commands/waifu.js';

// Mock the waifu service
vi.mock('../../src/services/waifu.js', () => ({
  getImage: vi.fn(),
  categories: ['waifu', 'hug', 'kiss', 'happy', 'handhold', 'bite']
}));

// Mock the utils
vi.mock('../../src/lib/utils.js', () => ({
  randomFrom: vi.fn()
}));

import { getImage } from '../../src/services/waifu.js';
import { randomFrom } from '../../src/lib/utils.js';

describe('waifu command', () => {
  let mockInteraction;

  beforeEach(() => {
    vi.resetAllMocks();

    mockInteraction = {
      deferReply: vi.fn(),
      editReply: vi.fn(),
      options: {
        getString: vi.fn()
      }
    };
  });

  it('should successfully send waifu image with default category', async () => {
    const mockImageData = {
      url: 'https://example.com/waifu.jpg',
      category: 'waifu'
    };

    mockInteraction.options.getString.mockReturnValueOnce(null);
    getImage.mockResolvedValueOnce(mockImageData);
    randomFrom.mockReturnValueOnce("Here's Your Daily Dose of Motivation ✨");
    mockInteraction.deferReply.mockResolvedValueOnce();
    mockInteraction.editReply.mockResolvedValueOnce();

    await execute(mockInteraction);

    expect(mockInteraction.deferReply).toHaveBeenCalled();
    expect(getImage).toHaveBeenCalledWith(undefined);
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      embeds: [
        expect.objectContaining({
          data: expect.objectContaining({
            color: 15431372, // #ea76cb in decimal
            title: "Here's Your Daily Dose of Motivation ✨",
            description: '*Category: waifu*',
            image: { url: 'https://example.com/waifu.jpg' },
            footer: { text: 'Powered by waifu.pics' },
            timestamp: expect.any(String)
          })
        })
      ]
    });
  });

  it('should successfully send waifu image with specified category', async () => {
    const mockImageData = {
      url: 'https://example.com/hug.jpg',
      category: 'hug'
    };

    mockInteraction.options.getString.mockReturnValueOnce('HUG');
    getImage.mockResolvedValueOnce(mockImageData);
    randomFrom.mockReturnValueOnce('A Waifu Appears! 💖');
    mockInteraction.deferReply.mockResolvedValueOnce();
    mockInteraction.editReply.mockResolvedValueOnce();

    await execute(mockInteraction);

    expect(getImage).toHaveBeenCalledWith('hug');
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      embeds: [
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'A Waifu Appears! 💖',
            description: '*Category: hug*',
            image: { url: 'https://example.com/hug.jpg' }
          })
        })
      ]
    });
  });

  it('should handle getImage service failure', async () => {
    mockInteraction.options.getString.mockReturnValueOnce('waifu');
    getImage.mockRejectedValueOnce(new Error('API request failed'));
    mockInteraction.deferReply.mockResolvedValueOnce();

    await expect(execute(mockInteraction)).rejects.toThrow('Failed to fetch waifu image: API request failed');

    expect(mockInteraction.deferReply).toHaveBeenCalled();
    expect(mockInteraction.editReply).not.toHaveBeenCalled();
  });

  it('should handle deferReply failure', async () => {
    mockInteraction.deferReply.mockRejectedValueOnce(new Error('Failed to defer'));

    await expect(execute(mockInteraction)).rejects.toThrow('Failed to defer');
    expect(getImage).not.toHaveBeenCalled();
  });

  it('should handle randomFrom returning null', async () => {
    const mockImageData = {
      url: 'https://example.com/waifu.jpg',
      category: 'waifu'
    };

    mockInteraction.options.getString.mockReturnValueOnce(null);
    getImage.mockResolvedValueOnce(mockImageData);
    randomFrom.mockReturnValueOnce(null);
    mockInteraction.deferReply.mockResolvedValueOnce();
    mockInteraction.editReply.mockResolvedValueOnce();

    await execute(mockInteraction);

    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      embeds: [
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Your Waifu is Here! 💖' // fallback title
          })
        })
      ]
    });
  });

  it('should handle unknown errors gracefully', async () => {
    mockInteraction.options.getString.mockReturnValueOnce('waifu');
    getImage.mockRejectedValueOnce('unknown error type');
    mockInteraction.deferReply.mockResolvedValueOnce();

    await expect(execute(mockInteraction)).rejects.toThrow('Failed to fetch waifu image: Unknown error');
  });

  it('should handle empty category string', async () => {
    const mockImageData = {
      url: 'https://example.com/waifu.jpg',
      category: 'waifu'
    };

    mockInteraction.options.getString.mockReturnValueOnce('');
    getImage.mockResolvedValueOnce(mockImageData);
    randomFrom.mockReturnValueOnce('Test Title');
    mockInteraction.deferReply.mockResolvedValueOnce();
    mockInteraction.editReply.mockResolvedValueOnce();

    await execute(mockInteraction);

    expect(getImage).toHaveBeenCalledWith(undefined);
  });

  it('should preserve embed structure and properties', async () => {
    const mockImageData = {
      url: 'https://example.com/test.jpg',
      category: 'test'
    };

    mockInteraction.options.getString.mockReturnValueOnce(null);
    getImage.mockResolvedValueOnce(mockImageData);
    randomFrom.mockReturnValueOnce('Test Title');
    mockInteraction.deferReply.mockResolvedValueOnce();
    mockInteraction.editReply.mockResolvedValueOnce();

    await execute(mockInteraction);

    const embedCall = mockInteraction.editReply.mock.calls[0][0];
    const embed = embedCall.embeds[0];

    expect(embed.data).toMatchObject({
      color: 15431372,
      title: 'Test Title',
      description: '*Category: test*',
      image: { url: 'https://example.com/test.jpg' },
      footer: { text: 'Powered by waifu.pics' },
      timestamp: expect.any(String)
    });
  });
});
