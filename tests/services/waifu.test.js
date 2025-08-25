import { afterEach, describe, test, mock } from 'node:test';
import assert from 'node:assert';
import WaifuService from '../../src/services/waifu.js';

describe('WaifuService', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  test('should reject invalid category', async () => {
    await assert.rejects(
      async () => {
        await WaifuService.getImage('invalid-category');
      },
      {
        message: 'The `invalid-category` category is not valid'
      }
    );
  });

  test('should return a valid image object', async () => {
    mock.method(global, 'fetch', async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          url: 'https://example.com/image.jpg'
        })
      };
    });

    const image = await WaifuService.getImage('waifu');
    assert.strictEqual(image.url, 'https://example.com/image.jpg');
    assert.strictEqual(image.category, 'waifu');
    assert.ok(image.title);
    assert.ok(WaifuService.titles.includes(image.title));
  });

  test('should use random category when none provided', async () => {
    mock.method(global, 'fetch', async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          url: 'https://example.com/image.jpg'
        })
      };
    });

    const image = await WaifuService.getImage();
    assert.ok(WaifuService.categories.includes(image.category));
  });

  test('should throw an error if the API is not available', async () => {
    mock.method(global, 'fetch', async () => {
      return {
        ok: false,
        status: 503
      };
    });

    await assert.rejects(
      async () => {
        await WaifuService.getImage('waifu');
      },
      {
        message: 'The waifu.pics API is not available at the moment. Status code: 503'
      }
    );
  });

  test('should throw an error if the response JSON is invalid', async () => {
    mock.method(global, 'fetch', async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          invalidField: 'This is not a valid response'
        })
      };
    });

    await assert.rejects(
      async () => {
        await WaifuService.getImage('waifu');
      },
      {
        message: /The responsed JSON from waifu.pics is not valid/
      }
    );
  });

  test('should export categories and titles', () => {
    assert.ok(Array.isArray(WaifuService.categories));
    assert.ok(Array.isArray(WaifuService.titles));
    assert.ok(WaifuService.categories.length > 0);
    assert.ok(WaifuService.titles.length > 0);
  });
});
