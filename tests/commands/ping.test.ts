import { ChatInputCommandInteraction } from 'discord.js';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { execute } from '~/commands/ping';

interface MockInteraction {
  reply: Mock;
  fetchReply: Mock;
  client: {
    ws: {
      ping: number;
    };
  };
  editReply: Mock;
  createdTimestamp: number;
}

describe('ping', () => {
  let mockInteraction: MockInteraction;

  beforeEach(() => {
    mockInteraction = {
      reply: vi.fn(),
      fetchReply: vi.fn().mockReturnValue({ createdTimestamp: 1000 }),
      client: {
        ws: {
          ping: 100
        }
      },
      editReply: vi.fn(),
      createdTimestamp: 1000
    };
  });

  it('should reply with correct ping information', async () => {
    mockInteraction.fetchReply.mockReturnValueOnce({
      createdTimestamp: 1100 // 100ms later
    });

    await execute(mockInteraction as unknown as ChatInputCommandInteraction);

    expect(mockInteraction.reply).toBeCalledTimes(1);
    expect(mockInteraction.reply).toBeCalledWith('Pinging...');
    expect(mockInteraction.editReply).toBeCalledTimes(1);
    expect(mockInteraction.editReply).toBeCalledWith(
      '🏓 Pong!\n🏃 Round-trip latency: `100ms`\n🏃 WebSocket ping: `100ms`'
    );
  });

  it.each([
    { created: 1000, replied: 1050, expected: 50 },
    { created: 2000, replied: 2250, expected: 250 },
    { created: 5000, replied: 5001, expected: 1 }
  ])(
    'should reply $expected when created = $created and replied = $replied',
    async ({ created, replied, expected }) => {
      mockInteraction.createdTimestamp = created;
      mockInteraction.fetchReply.mockReturnValueOnce({ createdTimestamp: replied });

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
