import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { SlashCommand } from '~/types';
import { updateClientId, resolveUrl } from '~/services/soundcloud';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('yo')
    .setDescription('Music commands')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('play')
        .setDescription('Play a track from SoundCloud')
        .addStringOption((option) =>
          option.setName('query').setDescription('An URL or a search term').setRequired(true)
        )
    ),
  async execute(interaction) {
    await interaction.deferReply();

    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'play') {
      const clientId = await updateClientId();
      if (!clientId) {
        throw new Error('Failed to update client id');
      }

      const queryParam = interaction.options.getString('query', true);
      if (/^https:\/\/soundcloud\.com.*/.test(queryParam)) {
        const track = await resolveUrl(queryParam, clientId);
        const embed = new EmbedBuilder()
          .setTitle('🎶 Now playing 🎶')
          .setImage(track.artwork_url)
          .setDescription(`[${track.title}](${track.permalink_url})`)
          .setFooter({
            text: 'Powered by SoundCloud',
            iconURL: 'https://a-v2.sndcdn.com/assets/images/sc-icons/ios-a62dfc8fe7.png'
          })
          .setTimestamp();
        await interaction.followUp({ embeds: [embed] });
      } else {
        await interaction.followUp('Search term is not supported yet.');
      }
    }
  }
};

export default command;
