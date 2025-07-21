/**
 * @file Unit tests for waifu command
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 */

import { afterEach, beforeEach, describe, it, vi, expect } from 'vitest';
import type { MockChatInteraction } from '~/types';
import * as waifu from '~/services/waifu';
import waifuCommand from '~/commands/waifu';

describe('waifu command', () => {
  let mockInteraction: MockChatInteraction;

  beforeEach(() => {
    mockInteraction = {
      deferReply: vi.fn().mockResolvedValue(true),
      options: {
        getString: vi.fn().mockReturnValue('mock')
      },
      followUp: vi.fn()
    } as MockChatInteraction;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    { url: 'https://waifu.mock', category: 'hehe', title: 'oidoioi' },
    { url: 'https://mock.waifu', category: 'waifu', title: 'i love you, Truyen' },
    { url: 'https://cdn.waifu.mock/img1234567890.png', category: '', title: 'Untitled Waifu' },
    { url: 'https://waifu.mock/nekos', category: 'nekos', title: 'Classic Neko Style' }
  ])(
    'should reply to user correctly with url = $url, category = $category, title = $title',
    async ({ url, category, title }) => {
      const spyGetImage = vi.spyOn(waifu, 'getImage');
      spyGetImage.mockResolvedValue({
        url,
        category,
        title
      });
      vi.setSystemTime(Date.UTC(2022, 0, 15, 17, 15, 20, 66));

      await waifuCommand.execute(mockInteraction);

      expect(mockInteraction.deferReply).toHaveBeenCalledOnce();
      expect(mockInteraction.options.getString).toHaveBeenCalledOnce();
      expect(spyGetImage).toHaveBeenCalledOnce();
      expect(mockInteraction.followUp.mock.calls[0]?.[0]).toMatchSnapshot();
    }
  );

  it('should work when category is not provided', async () => {
    mockInteraction.options.getString = vi.fn().mockReturnValue(null);
    const spyGetImage = vi.spyOn(waifu, 'getImage').mockResolvedValue({
      url: 'https://waifu.mock/default.jpg',
      category: 'default',
      title: 'default title'
    });

    await waifuCommand.execute(mockInteraction);

    expect(spyGetImage).toHaveBeenCalledWith(undefined);
    expect(mockInteraction.followUp).toHaveBeenCalledOnce();
  });
});
