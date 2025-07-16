import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getImage, categories } from '../services/waifu.js';
import { randomFrom } from '../lib/utils.js';

/** @type {string[]} */
const titles = [
  "Here's Your Daily Dose of Motivation ✨",
  'A Waifu Appears! 💖',
  'Stay Strong, Senpai! 💪',
  "You Got This! Here's Some Motivation 🔥",
  'Summoning Your Waifu... 💫',
  'Your Waifu Believes in You! 🌸',
  'Power Up Time! 🚀',
  "Don't Give Up, Senpai! 💥",
  'Waifu Buff Activated! ⚡',
  "Keep Going, You're Doing Great! 🌟",
  'One Step Closer to Victory! 🏆',
  'Level Up Your Spirit! 🆙',
  'Another Day, Another Quest! 🗺️',
  "You're Stronger Than You Think! 🐉",
  "Waifu's Blessing Incoming! 🍀"
];

const data = new SlashCommandBuilder()
  .setName('waifu')
  .setDescription('Get a random cute anime girl image to boost your motivation 💖')
  .addStringOption((option) =>
    option
      .setName('category')
      .setDescription('The category of image')
      .addChoices(categories.map((v) => ({ name: v, value: v })))
  );

/**
 * Executes the waifu command and returns a motivational anime image
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - The command interaction
 * @returns {Promise<void>}
 */
async function execute(interaction) {
  await interaction.deferReply();

  try {
    const categoryParam = interaction.options.getString('category')?.toLowerCase() || undefined;
    const { url, category } = await getImage(categoryParam);

    const embed = new EmbedBuilder()
      .setColor(15431372)
      .setTitle(randomFrom(titles) || 'Your Waifu is Here! 💖')
      .setDescription(`*Category: ${category}*`)
      .setImage(url)
      .setFooter({ text: 'Powered by waifu.pics' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    throw new Error(`Failed to fetch waifu image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export { data, execute };
