import { afterEach, describe, mock, test } from 'node:test';
import WaifuService from '../../src/services/waifu.js';

describe('WaifuService', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  test('should reject invalid category', async (t) => {
    await t.assert.rejects(
      async () => {
        await WaifuService.getImage('invalid-category');
      },
      {
        message: 'The `invalid-category` category is not valid'
      }
    );
  });

  test('should return a valid image object', async (t) => {
    t.mock.method(global, 'fetch', async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          url: 'https://example.com/image.jpg'
        })
      } as Response;
    });

    const image = await WaifuService.getImage('waifu');
    t.assert.equal(image.url, 'https://example.com/image.jpg');
  });

  test('should throw an error if the API is not available', async (t) => {
    t.mock.method(global, 'fetch', async () => {
      return {
        ok: false,
        status: 503
      } as Response;
    });

    await t.assert.rejects(
      async () => {
        await WaifuService.getImage('waifu');
      },
      {
        message: 'The waifu.pics API is not available at the moment. Status code: 503'
      }
    );
  });

  test('should throw an error if the response JSON is invalid', async (t) => {
    t.mock.method(global, 'fetch', async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          invalidField: 'This is not a valid response'
        })
      } as Response;
    });

    await t.assert.rejects(
      async () => {
        await WaifuService.getImage('waifu');
      },
      {
        message: /The responsed JSON from waifu.pics is not valid/
      }
    );
  });
});
