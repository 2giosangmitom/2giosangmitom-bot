import { ChatInputCommandInteraction } from 'discord.js';
import { describe, vi, expect, beforeEach, afterEach, it } from 'vitest';
import { execute } from '~/commands/waifu';
import * as waifu from '~/services/waifu';

describe('waifu', () => {
  let mockInteraction: MockChatInteraction;

  beforeEach(() => {
    mockInteraction = {
      deferReply: vi.fn().mockResolvedValue(true),
      options: {
        getString: vi.fn().mockReturnValue('mock')
      },
      editReply: vi.fn()
    } as MockChatInteraction;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    { url: 'https://waifu.mock', category: 'hehe', title: 'oidoioi' },
    { url: 'https://mock.waifu', category: 'waifu', title: 'i love you, Truyen' }
  ])(
    'should reply to user correctly with url = $url, category = $category, title = $title',
    async ({ url, category, title }) => {
      const spyGetImage = vi.spyOn(waifu, 'getImage');
      spyGetImage.mockResolvedValue({
        url,
        category,
        title
      });

      vi.setSystemTime(new Date(2022, 0, 15));

      await execute(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(mockInteraction.deferReply).toHaveBeenCalledOnce();
      expect(mockInteraction.options.getString).toHaveBeenCalledOnce();
      expect(spyGetImage).toHaveBeenCalledOnce();
      expect(mockInteraction.editReply.mock.calls).toMatchSnapshot();
    }
  );

  it('should work when category is not provided', async () => {
    mockInteraction.options.getString = vi.fn().mockReturnValue(null);

    const spyGetImage = vi.spyOn(waifu, 'getImage').mockResolvedValue({
      url: 'https://waifu.mock/default.jpg',
      category: 'default',
      title: 'default title'
    });

    await execute(mockInteraction as unknown as ChatInputCommandInteraction);

    expect(spyGetImage).toHaveBeenCalledWith(undefined);
    expect(mockInteraction.editReply).toHaveBeenCalledOnce();
  });
});
