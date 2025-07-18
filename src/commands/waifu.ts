/**
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 * @license MIT
 * @copyright © 2025 Vo Quang Chien
 */

import { ChatInputCommandInteraction, EmbedBuilder, italic, SlashCommandBuilder } from 'discord.js';
import { getImage, categories } from '~/services/waifu';

const data = new SlashCommandBuilder()
  .setName('waifu')
  .setDescription('Get a random cute anime girl image to boost your motivation 💖')
  .addStringOption((option) =>
    option
      .setName('category')
      .setDescription('The category of the image')
      .addChoices(categories.map((category) => ({ name: category, value: category })))
  );

/**
 * @description Get random image from waifu.pics and send to user.
 * @param interaction The slash command interaction object.
 */
async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const categoryParam = interaction.options.getString('category') ?? undefined;

  const { url, category, title } = await getImage(categoryParam);

  const waifuEmbed = new EmbedBuilder()
    .setColor('LuminousVividPink')
    .setTitle(title)
    .setDescription(italic(`Category: ${category}`))
    .setImage(url)
    .setFooter({ text: 'Powered by waifu.pics' })
    .setTimestamp();

  await interaction.editReply({ embeds: [waifuEmbed] });
}

export { data, execute };
