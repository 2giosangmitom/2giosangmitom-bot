import { expect, it, describe } from 'vitest';
import { randomFrom } from '../../src/lib/utils.js';

describe('randomFrom', () => {
  it('should return null for empty array', () => {
    expect(randomFrom([])).toBe(null);
  });

  it('should throw TypeError for non-array input', () => {
    expect(() => randomFrom(null)).toThrow(TypeError);
    expect(() => randomFrom(undefined)).toThrow(TypeError);
    expect(() => randomFrom('string')).toThrow(TypeError);
    expect(() => randomFrom(123)).toThrow(TypeError);
    expect(() => randomFrom({})).toThrow(TypeError);
  });

  it('should return the only element for single-element array', () => {
    const arr = ['single'];
    expect(randomFrom(arr)).toBe('single');
  });

  it('should return an element from the array', () => {
    const arr = ['a', 'b', 'c', 'd', 'e'];
    const result = randomFrom(arr);
    expect(arr).toContain(result);
  });

  it('should work with different data types', () => {
    const numbers = [1, 2, 3];
    const result = randomFrom(numbers);
    expect(numbers).toContain(result);
    expect(typeof result).toBe('number');

    const objects = [{ id: 1 }, { id: 2 }];
    const objResult = randomFrom(objects);
    expect(objects).toContain(objResult);
    expect(typeof objResult).toBe('object');
  });

  it('should have reasonable distribution over multiple calls', () => {
    const arr = ['a', 'b', 'c'];
    const results = new Set();

    // Run many times to check we get different results
    for (let i = 0; i < 100; i++) {
      results.add(randomFrom(arr));
    }

    // Should have gotten at least 2 different values in 100 tries
    expect(results.size).toBeGreaterThan(1);
  });
});
