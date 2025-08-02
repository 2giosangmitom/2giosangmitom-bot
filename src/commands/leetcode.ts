import { EmbedBuilder, italic, MessageFlags, SlashCommandBuilder } from 'discord.js';
import LeetcodeService from '../services/leetcode.js';
import consola from 'consola';
import WaifuService from '../services/waifu.js';
import Fuse from 'fuse.js';

// Load cached data if available
let cachedData: Awaited<ReturnType<typeof LeetcodeService.loadData>> | null = null;
let fuseInstance: Fuse<string> | null = null;

process.nextTick(async () => {
  try {
    cachedData = await LeetcodeService.loadData();
    consola.success('Loaded cached LeetCode data successfully.');
  } catch (error) {
    if (error instanceof Error) {
      consola.warn('Failed to load cached LeetCode data:', error.message);
      consola.info('Downloading fresh data from LeetCode...');
    }

    try {
      const data = await LeetcodeService.downloadData();
      await LeetcodeService.saveData(data);
      consola.success('Downloaded and saved fresh LeetCode data successfully.');

      // Reload data again
      cachedData = await LeetcodeService.loadData();
    } catch (downloadError) {
      if (error instanceof Error) {
        consola.error('Failed to download LeetCode data:', downloadError);
      }
    }
  }
});

const leetcode: Command = {
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
  async execute(interaction) {
    if (!cachedData) {
      await interaction.reply({
        content: 'No LeetCode data available. Please try again later.',
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
        .setTitle(`${problem.title}`)
        .setURL(problem.url)
        .setColor(
          problem.difficulty === 'Easy'
            ? 'Green'
            : problem.difficulty === 'Medium'
              ? 'Yellow'
              : 'Red'
        )
        .setFooter({
          text: `Powered by LeetCode`,
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

      if (problem.difficulty === 'Hard') {
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
      }
    } catch (error) {
      consola.error('Error fetching random problem:', error);
      await interaction.followUp({
        content: 'Failed to fetch a random LeetCode problem.',
        flags: MessageFlags.Ephemeral
      });
    }
  },
  async autocomplete(interaction) {
    if (!cachedData) {
      await interaction.respond([]);
      return;
    }

    const focusedValue = interaction.options.getFocused();
    const topics = cachedData.topics;

    // If no search term, return first 25 topics
    if (!focusedValue || !focusedValue.trim()) {
      const topicsToShow = topics.slice(0, 25);
      await interaction.respond(topicsToShow.map((topic) => ({ name: topic, value: topic })));
      return;
    }

    // Create Fuse instance for search if we have a search term
    if (!fuseInstance && topics && topics.length > 0) {
      fuseInstance = new Fuse(topics, {
        includeScore: true,
        threshold: 0.3
      });
    }

    if (fuseInstance) {
      const result = fuseInstance.search(focusedValue, { limit: 25 });
      if (result && Array.isArray(result)) {
        await interaction.respond(result.map((res) => ({ name: res.item, value: res.item })));
      } else {
        await interaction.respond([]);
      }
    } else {
      await interaction.respond([]);
    }
  }
};

export default leetcode;
