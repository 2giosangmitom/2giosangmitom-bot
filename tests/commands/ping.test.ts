/**
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 * @license MIT
 * @copyright © 2025 Vo Quang Chien
 */

import { ChatInputCommandInteraction } from 'discord.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execute } from '~/commands/ping';

describe('ping', () => {
  let mockInteraction: MockChatInteraction;

  beforeEach(() => {
    mockInteraction = {
      reply: vi.fn(),
      fetchReply: vi.fn().mockResolvedValue({ createdTimestamp: 1000 }),
      client: {
        ws: {
          ping: 100
        }
      },
      editReply: vi.fn(),
      createdTimestamp: 1000
    } as MockChatInteraction;
  });

  it('should reply with correct ping information', async () => {
    mockInteraction.fetchReply.mockResolvedValueOnce({
      createdTimestamp: 1100 // 100ms later
    });

    await execute(mockInteraction as unknown as ChatInputCommandInteraction);

    expect(mockInteraction.reply).toBeCalledTimes(1);
    expect(mockInteraction.reply).toBeCalledWith('Pinging...');
    expect(mockInteraction.editReply).toBeCalledTimes(1);
    expect(mockInteraction.editReply.mock.calls).toMatchSnapshot();
  });

  it.each([
    { created: 1000, replied: 1050, expected: 50 },
    { created: 2000, replied: 2250, expected: 250 },
    { created: 5000, replied: 5001, expected: 1 }
  ])(
    'should reply $expected when created = $created and replied = $replied',
    async ({ created, replied, expected }) => {
      mockInteraction.createdTimestamp = created;
      mockInteraction.fetchReply.mockResolvedValueOnce({ createdTimestamp: replied });

      await execute(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toBeCalledWith(
        expect.stringContaining(`Round-trip latency: \`${expected}ms\``)
      );
    }
  );

  it.each([100, 200, 50, 20])(
    'should display WebSocket ping correctly when ping = %i',
    async (ping) => {
      mockInteraction.client.ws.ping = ping;

      await execute(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toBeCalledWith(
        expect.stringContaining(`WebSocket ping: \`${ping}ms\``)
      );
    }
  );
});
