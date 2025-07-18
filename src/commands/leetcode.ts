/**
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 * @license MIT
 * @copyright © 2025 Vo Quang Chien
 */

import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { randomFrom } from '~/lib/utils';
import { difficulties, loadData, filterQuestions } from '~/services/leetcode';

// Load LeetCode cache.
let leetcodeData: LeetCodeData | null = null;
loadData().then((v) => {
  leetcodeData = v;
});

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
    throw new Error('No data available at the moment.');
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

export { data, execute };
