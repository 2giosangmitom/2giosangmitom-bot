import { describe, test } from 'node:test';
import assert from 'node:assert';
import { randomFrom, toTitleCase } from '../../src/lib/utils.js';

describe('Utils', () => {
  describe('randomFrom', () => {
    test('should return an element from the array', () => {
      const arr = ['a', 'b', 'c'];
      const result = randomFrom(arr);
      assert.ok(arr.includes(result));
    });

    test('should return undefined for empty array', () => {
      const result = randomFrom([]);
      assert.strictEqual(result, undefined);
    });

    test('should return the only element for single-element array', () => {
      const arr = ['single'];
      const result = randomFrom(arr);
      assert.strictEqual(result, 'single');
    });

    test('should work with different data types', () => {
      const arr = [1, 'string', { key: 'value' }, null];
      const result = randomFrom(arr);
      assert.ok(arr.includes(result));
    });
  });

  describe('toTitleCase', () => {
    test('should convert single word to title case', () => {
      assert.strictEqual(toTitleCase('hello'), 'Hello');
      assert.strictEqual(toTitleCase('WORLD'), 'World');
      assert.strictEqual(toTitleCase('tEsT'), 'Test');
    });

    test('should convert multiple words to title case', () => {
      assert.strictEqual(toTitleCase('hello world'), 'Hello World');
      assert.strictEqual(toTitleCase('the quick brown fox'), 'The Quick Brown Fox');
      assert.strictEqual(toTitleCase('JAVASCRIPT IS AWESOME'), 'Javascript Is Awesome');
    });

    test('should handle empty string', () => {
      assert.strictEqual(toTitleCase(''), '');
    });

    test('should handle single character', () => {
      assert.strictEqual(toTitleCase('a'), 'A');
      assert.strictEqual(toTitleCase('Z'), 'Z');
    });

    test('should handle strings with extra spaces', () => {
      assert.strictEqual(toTitleCase('hello  world'), 'Hello  World');
      assert.strictEqual(toTitleCase(' leading space'), ' Leading Space');
      assert.strictEqual(toTitleCase('trailing space '), 'Trailing Space ');
    });
  });
});
