/**
 * @file Unit tests for ping command
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 */

import { EmbedBuilder, type Message, bold } from 'discord.js';
import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import ping from '~/commands/ping';
import type { MockChatInteraction } from '~/types';

describe('ping command', () => {
  let mockInteraction: MockChatInteraction;

  beforeEach(() => {
    mockInteraction = {
      reply: vi.fn(),
      fetchReply: vi.fn(),
      editReply: vi.fn(),
      client: {
        ws: {
          ping: 100
        }
      }
    } as MockChatInteraction;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    { created: 1000, replied: 1050, expected: 50 },
    { created: 2000, replied: 2250, expected: 250 },
    { created: 5000, replied: 5001, expected: 1 }
  ])(
    'should reply $expected when created = $created and replied = $replied',
    async ({ created, replied, expected }) => {
      mockInteraction.createdTimestamp = created;
      mockInteraction.fetchReply.mockResolvedValueOnce({
        createdTimestamp: replied
      } as Message);

      await ping.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledOnce();
      expect(mockInteraction.editReply).toHaveBeenCalledExactlyOnceWith({
        content: '',
        embeds: [
          new EmbedBuilder()
            .setTitle('🏓 Pong!')
            .addFields(
              { name: 'Execution time', value: bold(`${expected} ms`), inline: true },
              {
                name: 'WebSocket ping',
                value: bold(`${mockInteraction.client.ws.ping} ms`),
                inline: true
              }
            )
            .setColor('Blue')
        ]
      });
    }
  );
});
