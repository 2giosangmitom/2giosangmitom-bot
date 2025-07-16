import { SlashCommandBuilder, EmbedBuilder, italic } from 'discord.js';
import { getImage, categories } from '../services/waifu.js';
import { randomFrom } from '../lib/utils.js';

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
      .addChoices(...categories.map((v) => ({ name: v, value: v })))
  );

/**
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
async function execute(interaction) {
  await interaction.deferReply();

  const categoryParam = interaction.options.getString('category')?.toLowerCase();
  const { url, category } = await getImage(categoryParam);
  const embed = new EmbedBuilder()
    .setColor('#ea76cb')
    .setTitle(randomFrom(titles))
    .setDescription(italic(`Category: ${category}`))
    .setImage(url)
    .setFooter({ text: 'Powered by waifu.pics' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

export { data, execute };
