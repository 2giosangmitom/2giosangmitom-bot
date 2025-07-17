import { describe, it, expect } from 'vitest';
import { randomFrom } from '~/lib/utils';

describe('randomFrom', () => {
  describe('when passing empty array', () => {
    it('returns null for empty array', () => {
      expect(randomFrom([])).toBeNull();
    });
  });

  describe('when passing non-empty array', () => {
    it('returns one element from array of strings', () => {
      const arr = ['hello', 'hi', 'yo', 'luffy'];

      const actual = randomFrom(arr);

      expect(arr).toContain(actual);
    });

    it('returns one element from array of numbers', () => {
      const arr = [1, 2, 3, 4, 5, 6];

      const actual = randomFrom(arr);

      expect(arr).toContain(actual);
    });
  });
});
