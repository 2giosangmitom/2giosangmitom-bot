import { afterEach, describe, test, mock } from 'node:test';
import assert from 'node:assert';
import waifuCommand from '../../src/commands/waifu.js';
import WaifuService from '../../src/services/waifu.js';

describe('Waifu Command', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  test('should have correct command data structure', () => {
    assert.ok(waifuCommand.data);
    assert.strictEqual(waifuCommand.data.name, 'waifu');
    assert.strictEqual(
      waifuCommand.data.description,
      'Get a random cute anime girl image to boost your motivation 💖'
    );
    assert.ok(typeof waifuCommand.execute === 'function');
  });

  test('should execute successfully with no category', async () => {
    // Mock the interaction
    const mockInteraction = {
      deferReply: mock.fn(async () => {}),
      followUp: mock.fn(async () => {}),
      options: {
        getString: mock.fn(() => null)
      }
    };

    // Mock WaifuService.getImage
    mock.method(WaifuService, 'getImage', async () => ({
      url: 'https://example.com/image.jpg',
      category: 'waifu',
      title: 'Test Title'
    }));

    await waifuCommand.execute(mockInteraction);

    // Verify interactions
    assert.strictEqual(mockInteraction.deferReply.mock.callCount(), 1);
    assert.strictEqual(mockInteraction.followUp.mock.callCount(), 1);
    assert.strictEqual(mockInteraction.options.getString.mock.callCount(), 1);
    assert.strictEqual(mockInteraction.options.getString.mock.calls[0].arguments[0], 'category');

    // Verify embed was sent
    const followUpCall = mockInteraction.followUp.mock.calls[0];
    assert.ok(followUpCall.arguments[0].embeds);
    assert.strictEqual(followUpCall.arguments[0].embeds.length, 1);
  });

  test('should execute successfully with specified category', async () => {
    const mockInteraction = {
      deferReply: mock.fn(async () => {}),
      followUp: mock.fn(async () => {}),
      options: {
        getString: mock.fn(() => 'happy')
      }
    };

    mock.method(WaifuService, 'getImage', async (category) => ({
      url: 'https://example.com/happy.jpg',
      category: category || 'waifu',
      title: 'Happy Waifu'
    }));

    await waifuCommand.execute(mockInteraction);

    assert.strictEqual(mockInteraction.deferReply.mock.callCount(), 1);
    assert.strictEqual(mockInteraction.followUp.mock.callCount(), 1);

    // Verify WaifuService was called with the correct category
    const getImageCall = WaifuService.getImage.mock.calls[0];
    assert.strictEqual(getImageCall.arguments[0], 'happy');
  });

  test('should handle WaifuService errors gracefully', async () => {
    const mockInteraction = {
      deferReply: mock.fn(async () => {}),
      followUp: mock.fn(async () => {}),
      options: {
        getString: mock.fn(() => null)
      }
    };

    mock.method(WaifuService, 'getImage', async () => {
      throw new Error('API Error');
    });

    // The command should throw since we're not handling errors in the command itself
    await assert.rejects(() => waifuCommand.execute(mockInteraction), { message: 'API Error' });
  });

  test('should have category choices that match WaifuService categories', () => {
    const choices = waifuCommand.data.options[0].choices;
    const categoryChoices = choices.map((choice) => choice.value);

    assert.deepStrictEqual(categoryChoices.sort(), WaifuService.categories.sort());
  });
});
