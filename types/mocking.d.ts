/**
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 * @license MIT
 * @copyright © 2025 Vo Quang Chien
 */

import { vi } from 'vitest';

export {};

declare global {
  interface MockChatInteraction {
    reply: ReturnType<typeof vi.fn>;
    fetchReply: ReturnType<typeof vi.fn>;
    client: {
      ws: {
        ping: number;
      };
    };
    editReply: ReturnType<typeof vi.fn>;
    createdTimestamp: number;
    deferReply: ReturnType<typeof vi.fn>;
    followUp: ReturnType<typeof vi.fn>;
    options: {
      getString: ReturnType<typeof vi.fn>;
      getBoolean: ReturnType<typeof vi.fn>;
    };
  }
}
