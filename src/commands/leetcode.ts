/**
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 * @license MIT
 * @copyright © 2025 Vo Quang Chien
 */

import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder
} from 'discord.js';
import Fuse from 'fuse.js';
import { randomFrom } from '~/lib/utils';
import { difficulties, loadData, filterQuestions } from '~/services/leetcode';

// LeetCode data cache
let leetcodeData: LeetCodeData | null = null;

// Fuse instance
let fuseInstance: Fuse<string> | null = null;

const data = new SlashCommandBuilder()
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
  );

/**
 * @description Get random image from waifu.pics and send to user.
 * @param interaction The slash command interaction object.
 */
async function execute(interaction: ChatInputCommandInteraction) {
  if (!leetcodeData) {
    if (!(leetcodeData = await loadData())) {
      throw new Error('No problems found at the moment');
    }
  }

  const difficultyParam = interaction.options.getString('difficulty') ?? undefined;
  const topicParam = interaction.options.getString('topic') ?? undefined;
  const includePaidParam = interaction.options.getBoolean('include-paid') ?? undefined;

  const questions = filterQuestions(leetcodeData, difficultyParam, topicParam, includePaidParam);
  const problem = randomFrom(questions);
  if (!problem) {
    throw new Error('No problems match your preference.');
  }

  const embed = new EmbedBuilder()
    .setTitle(`${problem.title}`)
    .setURL(problem.url)
    .setColor(
      problem.difficulty === 'easy' ? 'Green' : problem.difficulty === 'medium' ? 'Yellow' : 'Red'
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
    );

  await interaction.reply({ embeds: [embed] });
}

/**
 * @description Handles autocomplete for the topic parameter
 */
async function autocomplete(interaction: AutocompleteInteraction) {
  if (!leetcodeData) {
    throw new Error('No problems found at the moment');
  }

  const focusedValue = interaction.options.getFocused();

  // If no search term, return first 25 topics
  if (!focusedValue || !focusedValue.trim()) {
    const topicsToShow = leetcodeData.topics.slice(0, 25);
    await interaction.respond(topicsToShow.map((topic) => ({ name: topic, value: topic })));
    return;
  }

  // Create Fuse instance for search if we have a search term
  if (!fuseInstance && leetcodeData.topics && leetcodeData.topics.length > 0) {
    fuseInstance = new Fuse(leetcodeData.topics, {
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

export { data, execute, autocomplete };
