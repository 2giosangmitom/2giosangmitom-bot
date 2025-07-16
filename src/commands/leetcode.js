import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { randomFrom } from '../lib/utils.js';
import { filterQuestions, loadData } from '../services/leetcode.js';
import Fuse from 'fuse.js';

const difficulties = ['Easy', 'Medium', 'Hard'];
let leetCodeDataPromise = loadData();

const data = new SlashCommandBuilder()
  .setName('leetcode')
  .setDescription('Get random questions from LeetCode')
  .addStringOption((option) =>
    option
      .setName('difficulty')
      .setDescription('Set difficulty level')
      .addChoices(difficulties.map((v) => ({ name: v, value: v })))
  )
  .addStringOption((option) => option.setName('topic').setDescription('Set topic of the problem').setAutocomplete(true))
  .addBooleanOption((option) => option.setName('include-paid').setDescription('Include paid problems'));

/**
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
async function execute(interaction) {
  const leetcodeData = await leetCodeDataPromise;
  if (!leetcodeData) {
    throw new Error('No problems found at the moment');
  }

  const difficultyParam = interaction.options.getString('difficulty')?.toLowerCase() ?? randomFrom(difficulties);
  const topicParam = interaction.options.getString('topic')?.toLowerCase() ?? randomFrom(leetcodeData.topics);
  const includePaidParam = interaction.options.getBoolean('include-paid') ?? false;

  if (difficultyParam === null || topicParam === null || includePaidParam === null) {
    throw new Error('An error occurred while reading parameters');
  }

  const filterdProblems = filterQuestions(leetcodeData.problems, difficultyParam, topicParam, includePaidParam);

  // Check if filtered problems array is empty
  if (filterdProblems.length === 0) {
    await interaction.reply({
      content: `No problems found matching the criteria: difficulty=${difficultyParam}, topic=${topicParam}, include-paid=${includePaidParam}`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const problem = randomFrom(filterdProblems);
  if (!problem) {
    throw new Error('No problems match your preference');
  }

  const embed = new EmbedBuilder()
    .setTitle(`${problem.title}`)
    .setURL(problem.url)
    .setColor(problem.difficulty === 'easy' ? 'Green' : problem.difficulty === 'medium' ? 'Yellow' : 'Red')
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
 * @param {import('discord.js').AutocompleteInteraction} interaction
 */
async function autocomplete(interaction) {
  const leetcodeData = await leetCodeDataPromise;
  if (!leetcodeData) {
    throw new Error('No problems found at the moment');
  }

  const focusedValue = interaction.options.getFocused();
  const fuse = new Fuse(leetcodeData.topics, { includeScore: true });
  const result = fuse.search(focusedValue);
  await interaction.respond(result.map((res) => ({ name: res.item, value: res.item })));
}

export { data, execute, autocomplete };
