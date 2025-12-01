import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
  italic,
  MessageFlags
} from 'discord.js';
import WaifuService, { type WaifuCategory } from '../services/waifu';
import { createLogger } from '../lib/logger';
import { isAppError } from '../lib/errors';

const logger = createLogger('Command:Waifu');

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

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const categoryParam = interaction.options.getString('category') as WaifuCategory | undefined;

    try {
      const { url, category, title } = await WaifuService.getImage(categoryParam);

      const waifuEmbed = new EmbedBuilder()
        .setColor('LuminousVividPink')
        .setTitle(title)
        .setDescription(italic(`Category: ${category}`))
        .setImage(url)
        .setFooter({ text: 'Powered by waifu.pics' })
        .setTimestamp();

      await interaction.followUp({ embeds: [waifuEmbed] });

      logger.info('Waifu image sent', {
        userId: interaction.user.id,
        category
      });
    } catch (error) {
      logger.error('Failed to fetch waifu image', error, {
        userId: interaction.user.id,
        category: categoryParam
      });

      const message = isAppError(error)
        ? error.message
        : 'Failed to fetch waifu image. Please try again later.';

      await interaction.followUp({
        content: message,
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

export default waifu;
