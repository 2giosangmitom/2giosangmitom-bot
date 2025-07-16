import { expect, it, describe } from 'vitest';
import { response, normalize } from '../../src/services/auto-response.js';

describe('auto-response service', () => {
  describe('normalize', () => {
    const cases = [
      { str: 'Hello', expected: 'hello' },
      { str: 'HELLO', expected: 'hello' },
      { str: 'Xin chào', expected: 'xin chao' },
      { str: 'TẠI SAO KHÔNG VÀO ĐƯỢC?', expected: 'tai sao khong vao duoc?' },
      { str: 'Đây là tiếng Việt!', expected: 'day la tieng viet!' },
      { str: 'đĐđĐ', expected: 'dddd' },
      { str: 'Có dấu và chữ HOA', expected: 'co dau va chu hoa' },
      { str: 'không cần dấu câu.', expected: 'khong can dau cau.' },
      { str: 'Nhiều    khoảng trắng', expected: 'nhieu    khoang trang' },
      { str: 'Cảm ơn bạn đã đến!', expected: 'cam on ban da den!' },
      { str: '12345', expected: '12345' }, // numbers unchanged
      { str: '😄❤️🎉', expected: '😄❤️🎉' } // emoji unchanged
    ];

    it.each(cases)('normalize("%s") → "%s"', ({ str, expected }) => {
      expect(normalize(str)).toBe(expected);
    });

    it('should throw TypeError for non-string input', () => {
      expect(() => normalize(null)).toThrow(TypeError);
      expect(() => normalize(undefined)).toThrow(TypeError);
      expect(() => normalize(123)).toThrow(TypeError);
      expect(() => normalize([])).toThrow(TypeError);
      expect(() => normalize({})).toThrow(TypeError);
    });

    it('should handle empty string', () => {
      expect(normalize('')).toBe('');
    });

    it('should handle whitespace-only string', () => {
      expect(normalize('   ')).toBe('   ');
    });
  });

  describe('response', () => {
    it('should return null for non-string input', () => {
      expect(response(null)).toBe(null);
      expect(response(undefined)).toBe(null);
      expect(response(123)).toBe(null);
      expect(response([])).toBe(null);
      expect(response({})).toBe(null);
    });

    it('should return null for empty string', () => {
      expect(response('')).toBe(null);
    });

    it('should return null for messages with no triggers', () => {
      expect(response('this is a normal message')).toBe(null);
      expect(response('random text without triggers')).toBe(null);
    });

    it('should respond to profanity triggers', () => {
      const profanityInputs = ['vl', 'VCL', 'dcm', 'DM'];

      profanityInputs.forEach((input) => {
        const result = response(input);
        expect(result).toBe('Chui tuc con cark 🚫');
      });
    });

    it('should respond to greeting triggers', () => {
      const greetingInputs = ['hello', 'Hi', 'CHAO', 'yo', 'xin chao'];
      const expectedResponses = ['Chao ban 👋', 'Hi hi 😄', 'Toi nghe day!', 'Hello hello!'];

      greetingInputs.forEach((input) => {
        const result = response(input);
        expect(expectedResponses).toContain(result);
      });
    });

    it('should respond to meme request triggers', () => {
      const memeInputs = ['cho tao xem meme', 'CHO TAO XEM MEME'];
      const expectedResponses = ['Meme con cark', 'Xem meme lam j', 'Xem cuc cut'];

      memeInputs.forEach((input) => {
        const result = response(input);
        expect(expectedResponses).toContain(result);
      });
    });

    it('should handle Vietnamese diacritics in triggers', () => {
      const result = response('chào bạn');
      const expectedResponses = ['Chao ban 👋', 'Hi hi 😄', 'Toi nghe day!', 'Hello hello!'];
      expect(expectedResponses).toContain(result);
    });

    it('should be case insensitive', () => {
      expect(response('HELLO')).not.toBe(null);
      expect(response('hello')).not.toBe(null);
      expect(response('Hello')).not.toBe(null);
    });

    it('should match triggers within larger messages', () => {
      expect(response('hey hello there')).not.toBe(null);
      expect(response('please cho tao xem meme now')).not.toBe(null);
    });

    it('should handle potential errors gracefully', () => {
      // Test with very long string
      const longString = 'a'.repeat(10000) + ' hello ' + 'b'.repeat(10000);
      expect(() => response(longString)).not.toThrow();

      // Test with special characters
      expect(() => response('hello \u0000\u0001\u0002')).not.toThrow();
    });
  });
});
