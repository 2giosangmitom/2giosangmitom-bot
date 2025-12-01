import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  EmbedBuilder,
  italic,
  MessageFlags,
  SlashCommandBuilder
} from 'discord.js';
import LeetcodeService, { type LeetCodeData } from '../services/leetcode';
import WaifuService from '../services/waifu';
import Fuse from 'fuse.js';
import cron from 'node-cron';
import { createLogger } from '../lib/logger';
import { isTest } from '../lib/env';
import { getErrorMessage, isAppError, NotFoundError } from '../lib/errors';

const logger = createLogger('Command:LeetCode');

// State management
let cachedData: LeetCodeData | null = null;
let fuseInstance: Fuse<string> | null = null;

// Exported for testing
export const getCachedData = (): LeetCodeData | null => cachedData;
export const setCachedData = (data: LeetCodeData | null): void => {
  cachedData = data;
  fuseInstance = null; // Reset fuse when data changes
};

async function initializeCache(): Promise<void> {
  try {
    cachedData = await LeetcodeService.loadData();
    logger.info('Loaded cached LeetCode data');
  } catch (error) {
    if (error instanceof NotFoundError) {
      logger.warn('No cache found, downloading fresh data...');
    } else {
      logger.warn('Failed to load cache, downloading fresh data...', {
        error: getErrorMessage(error)
      });
    }

    try {
      const data = await LeetcodeService.downloadData();
      await LeetcodeService.saveData(data);
      cachedData = await LeetcodeService.loadData();
      logger.info('Downloaded and cached fresh LeetCode data');
    } catch (downloadError) {
      logger.error('Failed to download LeetCode data', downloadError);
    }
  }
}

async function updateLeetCodeData(): Promise<void> {
  logger.info('Starting scheduled LeetCode data update...');
  try {
    const data = await LeetcodeService.downloadData();
    await LeetcodeService.saveData(data);
    cachedData = await LeetcodeService.loadData();
    fuseInstance = null; // Reset fuse to rebuild with new data
    logger.info('Successfully updated LeetCode data cache');
  } catch (error) {
    logger.error('Failed to update LeetCode data', error);
  }
}

// Initialize cache and schedule updates (skip in test environment)
if (!isTest) {
  process.nextTick(initializeCache);

  cron.schedule('0 2 * * *', updateLeetCodeData, { timezone: 'UTC' });
  logger.info('Scheduled daily LeetCode data updates at 2:00 AM UTC');
}

function getFuseInstance(topics: string[]): Fuse<string> {
  if (!fuseInstance) {
    fuseInstance = new Fuse(topics, {
      includeScore: true,
      threshold: 0.3
    });
  }
  return fuseInstance;
}

const leetcode = {
  data: new SlashCommandBuilder()
    .setName('leetcode')
    .setDescription('Get random LeetCode problem')
    .addStringOption((option) =>
      option
        .setName('difficulty')
        .setDescription('Filter by difficulty level')
        .addChoices(
          LeetcodeService.difficulties.map((difficulty) => ({
            name: difficulty,
            value: difficulty
          }))
        )
    )
    .addStringOption((option) =>
      option.setName('topic').setDescription('Set topic of the problem').setAutocomplete(true)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!cachedData) {
      await interaction.reply({
        content: 'LeetCode data is not available yet. Please try again in a moment.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.deferReply();

    const difficulty = interaction.options.getString('difficulty') ?? undefined;
    const topic = interaction.options.getString('topic') ?? undefined;

    try {
      const problem = await LeetcodeService.getRandomProblem(cachedData, difficulty, topic);

      const embed = new EmbedBuilder()
        .setTitle(problem.title)
        .setURL(problem.url)
        .setColor(
          problem.difficulty === 'Easy'
            ? 'Green'
            : problem.difficulty === 'Medium'
              ? 'Yellow'
              : 'Red'
        )
        .setFooter({
          text: 'Powered by LeetCode',
          iconURL: 'https://assets.leetcode.com/static_assets/public/icons/favicon-160x160.png'
        })
        .setTimestamp()
        .addFields(
          {
            name: 'Acceptance Rate',
            value: `${(problem.acRate * 100).toFixed(2)}%`,
            inline: true
          },
          {
            name: 'Topics',
            value: problem.topics.length > 0 ? problem.topics.join(', ') : 'None'
          }
        );

      await interaction.followUp({ embeds: [embed] });

      logger.info('Sent LeetCode problem', {
        userId: interaction.user.id,
        problemId: problem.id,
        difficulty: problem.difficulty
      });

      // Send motivation for hard problems
      if (problem.difficulty === 'Hard') {
        try {
          const { url, category, title } = await WaifuService.getImage();
          const motivationEmbed = new EmbedBuilder()
            .setColor('LuminousVividPink')
            .setTitle(title)
            .setDescription(italic(`Category: ${category}`))
            .setImage(url)
            .setFooter({ text: 'Powered by waifu.pics' })
            .setTimestamp();

          await interaction.followUp({
            content: 'Motivation for solving hard problems!',
            embeds: [motivationEmbed]
          });
        } catch (waifuError) {
          logger.warn('Failed to send motivation image', {
            error: getErrorMessage(waifuError)
          });
        }
      }
    } catch (error) {
      logger.error('Failed to fetch random problem', error, {
        userId: interaction.user.id,
        difficulty,
        topic
      });

      const message = isAppError(error)
        ? error.message
        : 'Failed to fetch a random LeetCode problem.';

      await interaction.followUp({
        content: message,
        flags: MessageFlags.Ephemeral
      });
    }
  },

  async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    if (!cachedData) {
      await interaction.respond([]);
      return;
    }

    const focusedValue = interaction.options.getFocused();
    const topics = cachedData.topics;

    try {
      if (!focusedValue.trim()) {
        // Return first 25 topics when no search term
        const topicsToShow = topics.slice(0, 25);
        await interaction.respond(topicsToShow.map((topic) => ({ name: topic, value: topic })));
        return;
      }

      const fuse = getFuseInstance(topics);
      const results = fuse.search(focusedValue, { limit: 25 });

      await interaction.respond(results.map((res) => ({ name: res.item, value: res.item })));
    } catch (error) {
      logger.error('Autocomplete error', error);
      await interaction.respond([]);
    }
  }
};

export default leetcode;
