import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { randomFrom } from '../lib/utils.js';
import { filterQuestions, loadData } from '../services/leetcode.js';
import Fuse from 'fuse.js';

const difficulties = ['Easy', 'Medium', 'Hard'];

// Cache the LeetCode data promise to avoid multiple API calls
/** @type {Promise<import('../services/leetcode.js').LeetCodeData | null> | null} */
let leetCodeDataPromise = null;
/** @type {Fuse<string> | null} */
let fuseInstance = null;

/**
 * Gets or initializes the LeetCode data with caching
 * @returns {Promise<import('../services/leetcode.js').LeetCodeData | null>}
 */
async function getLeetCodeData() {
  // Reset cache in test environment or if promise is stale
  if (!leetCodeDataPromise || process.env.NODE_ENV === 'test' || process.env.VITEST) {
    leetCodeDataPromise = loadData();
  }
  const result = await leetCodeDataPromise;
  // If data is null, reset cache for next call
  if (!result) {
    leetCodeDataPromise = null;
    fuseInstance = null; // Also reset Fuse instance
  }
  return result;
}

/**
 * Gets or initializes the Fuse.js instance for topic search
 * @returns {Promise<Fuse<string> | null>}
 */
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
 * Executes the leetcode command
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
async function execute(interaction) {
  const leetcodeData = await getLeetCodeData();
  if (!leetcodeData) {
    throw new Error('No problems found at the moment');
  }

  let difficultyParam = interaction.options.getString('difficulty');
  let topicParam = interaction.options.getString('topic');
  const includePaidParam = interaction.options.getBoolean('include-paid') ?? false;

  // Set defaults if not provided
  if (!difficultyParam) {
    const randomDifficulty = randomFrom(difficulties);
    if (!randomDifficulty) {
      throw new Error('An error occurred while reading parameters');
    }
    difficultyParam = randomDifficulty;
  }

  if (!topicParam) {
    const randomTopic = randomFrom(leetcodeData.topics);
    if (!randomTopic) {
      throw new Error('An error occurred while reading parameters');
    }
    topicParam = randomTopic;
  }

  const filterdProblems = filterQuestions(
    leetcodeData.problems,
    difficultyParam.toLowerCase(),
    topicParam.toLowerCase(),
    includePaidParam
  );

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
    .setColor(problem.difficulty === 'easy' ? 5763719 : problem.difficulty === 'medium' ? 16776960 : 15548997)
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
 * Handles autocomplete for the topic parameter
 * @param {import('discord.js').AutocompleteInteraction} interaction
 */
async function autocomplete(interaction) {
  const leetcodeData = await getLeetCodeData();
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
