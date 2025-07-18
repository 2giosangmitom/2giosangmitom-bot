import { vi } from 'vitest';

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
    options: {
      getString: ReturnType<typeof vi.fn>;
    };
  }
}
