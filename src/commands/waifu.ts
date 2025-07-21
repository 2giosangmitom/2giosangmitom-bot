/**
 * @file Waifu command
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 */

import { ChatInputCommandInteraction, EmbedBuilder, italic, SlashCommandBuilder } from 'discord.js';
import { getImage, categories } from '~/services/waifu';
import type { SlashCommand } from '~/types';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('waifu')
    .setDescription('Get a random cute anime girl image to boost your motivation 💖')
    .addStringOption((option) =>
      option
        .setName('category')
        .setDescription('The category of the image')
        .addChoices(categories.map((category) => ({ name: category, value: category })))
    ),
  async execute(interaction: ChatInputCommandInteraction) {
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

    await interaction.followUp({ embeds: [waifuEmbed] });
  }
};

export default command;
