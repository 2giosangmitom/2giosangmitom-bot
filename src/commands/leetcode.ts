/**
 * @file LeetCode command
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 */

import { EmbedBuilder, italic, SlashCommandBuilder } from 'discord.js';
import Fuse from 'fuse.js';
import { difficulties } from '~/services/leetcode';
import { getImage } from '~/services/waifu';
import type { SlashCommand } from '~/types';

let fuseInstance: Fuse<string> | null = null;

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('leetcode')
    .setDescription('Get random questions from LeetCode')
    .addStringOption((option) =>
      option
        .setName('difficulty')
        .setDescription('Set difficulty level')
        .addChoices(difficulties.map((v) => ({ name: v, value: v })))
    )
    .addStringOption((option) =>
      option.setName('topic').setDescription('Set topic of the problem').setAutocomplete(true)
    )
    .addBooleanOption((option) =>
      option.setName('include-paid').setDescription('Include paid problems')
    ),
  async execute(interaction) {
    await interaction.deferReply();

    if (!interaction.client.leetcode.isReady()) {
      throw new Error('No problems found at the moment');
    }

    const difficultyParam = interaction.options.getString('difficulty') ?? undefined;
    const topicParam = interaction.options.getString('topic') ?? undefined;
    const includePaidParam = interaction.options.getBoolean('include-paid') ?? undefined;

    const problem = interaction.client.leetcode.pickRandomQuestion(
      difficultyParam,
      topicParam,
      includePaidParam
    );
    if (!problem) {
      throw new Error('No problems match your preference.');
    }

    const embeds = [
      new EmbedBuilder()
        .setTitle(`${problem.title}`)
        .setURL(problem.url)
        .setColor(
          problem.difficulty === 'easy'
            ? 'Green'
            : problem.difficulty === 'medium'
              ? 'Yellow'
              : 'Red'
        )
        .setFooter({ text: `Powered by LeetCode` })
        .setTimestamp()
        .addFields(
          {
            name: 'Acceptance Rate',
            value: `${(problem.acRate * 100).toFixed(2)}%`,
            inline: true
          },
          {
            name: 'Paid Only',
            value: problem.isPaid ? '✅ Yes' : '❌ No',
            inline: true
          },
          {
            name: 'Topics',
            value: problem.topics.length > 0 ? problem.topics.join(', ') : 'None'
          }
        )
    ];

    if (problem.difficulty === 'hard') {
      const { url, category, title } = await getImage();
      embeds.push(
        new EmbedBuilder()
          .setColor('LuminousVividPink')
          .setTitle(title)
          .setDescription(italic(`Category: ${category}`))
          .setImage(url)
          .setFooter({ text: 'Powered by waifu.pics' })
          .setTimestamp()
      );
    }

    await interaction.followUp({ embeds });
  },
  async autocomplete(interaction) {
    if (!interaction.client.leetcode.isReady()) {
      throw new Error('No problems found at the moment');
    }

    const focusedValue = interaction.options.getFocused();
    const topics = interaction.client.leetcode.getTopics();

    if (!topics) {
      throw new Error('No topics found at the moment');
    }

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

export default command;
