import { SlashCommandBuilder } from 'discord.js';
import type { SlashCommand } from '~/types';

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
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'play') {
      await interaction.deferReply();
      const queryParam = interaction.options.getString('query', true);
      await interaction.client.music.play(queryParam, interaction);
    }
  }
};

export default command;
