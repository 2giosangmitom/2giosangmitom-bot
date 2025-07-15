import { expect, it, describe } from 'vitest';
import { normalize } from '../../src/services/auto-response.js';

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
});
