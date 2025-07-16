import { expect, it, describe, vi, beforeEach } from 'vitest';
import { execute } from '../../src/commands/ping.js';

describe('ping command', () => {
  let mockInteraction;

  beforeEach(() => {
    mockInteraction = {
      reply: vi.fn(),
      fetchReply: vi.fn(),
      editReply: vi.fn(),
      createdTimestamp: 1000,
      client: {
        ws: {
          ping: 50
        }
      }
    };
  });

  it('should reply with ping information', async () => {
    const mockReplyMessage = {
      createdTimestamp: 1100 // 100ms later
    };

    mockInteraction.reply.mockResolvedValueOnce();
    mockInteraction.fetchReply.mockResolvedValueOnce(mockReplyMessage);
    mockInteraction.editReply.mockResolvedValueOnce();

    await execute(mockInteraction);

    expect(mockInteraction.reply).toHaveBeenCalledWith('Pinging...');
    expect(mockInteraction.fetchReply).toHaveBeenCalled();
    expect(mockInteraction.editReply).toHaveBeenCalledWith(
      '🏓 Pong!\n🏃 Round-trip latency: `100ms`\n🏃 WebSocket ping: `50ms`'
    );
  });

  it('should handle reply failure gracefully', async () => {
    mockInteraction.reply.mockRejectedValueOnce(new Error('Failed to reply'));

    await expect(execute(mockInteraction)).rejects.toThrow('Failed to reply');
  });

  it('should handle fetchReply failure gracefully', async () => {
    mockInteraction.reply.mockResolvedValueOnce();
    mockInteraction.fetchReply.mockRejectedValueOnce(new Error('Failed to fetch'));

    await expect(execute(mockInteraction)).rejects.toThrow('Failed to fetch');
  });

  it('should calculate correct latency with different timestamps', async () => {
    const testCases = [
      { created: 1000, replied: 1050, expected: 50 },
      { created: 2000, replied: 2250, expected: 250 },
      { created: 5000, replied: 5001, expected: 1 }
    ];

    for (const testCase of testCases) {
      mockInteraction.createdTimestamp = testCase.created;
      const mockReplyMessage = { createdTimestamp: testCase.replied };

      mockInteraction.reply.mockResolvedValueOnce();
      mockInteraction.fetchReply.mockResolvedValueOnce(mockReplyMessage);
      mockInteraction.editReply.mockResolvedValueOnce();

      await execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.stringContaining(`Round-trip latency: \`${testCase.expected}ms\``)
      );

      // Reset mocks for next iteration
      vi.clearAllMocks();
    }
  });

  it('should display WebSocket ping correctly', async () => {
    const mockReplyMessage = { createdTimestamp: 1100 };
    mockInteraction.client.ws.ping = 25;

    mockInteraction.reply.mockResolvedValueOnce();
    mockInteraction.fetchReply.mockResolvedValueOnce(mockReplyMessage);
    mockInteraction.editReply.mockResolvedValueOnce();

    await execute(mockInteraction);

    expect(mockInteraction.editReply).toHaveBeenCalledWith(expect.stringContaining('WebSocket ping: `25ms`'));
  });

  it('should handle negative latency (clock skew)', async () => {
    const mockReplyMessage = {
      createdTimestamp: 900 // Before interaction created (clock skew)
    };

    mockInteraction.reply.mockResolvedValueOnce();
    mockInteraction.fetchReply.mockResolvedValueOnce(mockReplyMessage);
    mockInteraction.editReply.mockResolvedValueOnce();

    await execute(mockInteraction);

    expect(mockInteraction.editReply).toHaveBeenCalledWith(expect.stringContaining('Round-trip latency: `-100ms`'));
  });
});
