import { EmbedBuilder, SlashCommandBuilder, italic } from 'discord.js';
import WaifuService from '../services/waifu.js';

const waifu = {
  data: new SlashCommandBuilder()
    .setName('waifu')
    .setDescription('Get a random cute anime girl image to boost your motivation 💖')
    .addStringOption((option) =>
      option
        .setName('category')
        .setDescription('The category of the image')
        .addChoices(
          WaifuService.categories.map((category) => ({
            name: category,
            value: category
          }))
        )
    ),
  async execute(interaction) {
    await interaction.deferReply();

    const categoryParam = interaction.options.getString('category') ?? undefined;

    const { url, category, title } = await WaifuService.getImage(categoryParam);

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

export default waifu;
