import { expect, it, describe } from 'vitest';
import { replyMessage, normalize } from '~/services/auto-response';

describe('auto-response', () => {
  describe('normalize', () => {
    it.each([
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
    ])('normalize("%s") → "%s"', ({ str, expected }) => {
      expect(normalize(str)).toBe(expected);
    });

    it('should handle empty string', () => {
      expect(normalize('')).toBe('');
    });

    it('should handle whitespace-only string', () => {
      expect(normalize('   ')).toBe('   ');
    });
  });

  describe('replyMessage', () => {
    it('should return null for messages with no triggers', () => {
      expect(replyMessage('this is a normal message')).toBe(null);
      expect(replyMessage('random text without triggers')).toBe(null);
    });

    it.each(['hello', 'Hi', 'CHAO', 'yo', 'xin chao'])(
      'should respond to message = %s',
      (message) => {
        const result = replyMessage(message);
        expect(result).not.toBeNull();
      }
    );

    it('should handle Vietnamese diacritics in triggers', () => {
      const result = replyMessage('chào bạn');
      expect(result).not.toBeNull();
    });

    it('should be case insensitive', () => {
      expect(replyMessage('HELLO')).not.toBeNull();
      expect(replyMessage('hello')).not.toBeNull();
      expect(replyMessage('Hello')).not.toBeNull();
    });
  });
});
