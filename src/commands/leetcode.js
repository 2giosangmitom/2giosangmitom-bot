import { SlashCommandBuilder } from 'discord.js';

const data = new SlashCommandBuilder()
  .setName('leetcode')
  .setDescription('Get random questions from LeetCode')
  .addStringOption((option) =>
    option
      .setName('difficulty')
      .setDescription('Set difficulty level')
      .addChoices([
        { name: 'Easy', value: 'Easy' },
        { name: 'Medium', value: 'Medium' },
        { name: 'Hard', value: 'Hard' }
      ])
  );

export { data };
