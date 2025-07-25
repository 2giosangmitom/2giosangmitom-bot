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
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('skip').setDescription('Skip the current track')
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('pause').setDescription('Pause the current track')
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('resume').setDescription('Resume the paused track')
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('stop').setDescription('Stop music and clear the queue')
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('queue').setDescription('Show the current music queue')
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('leave').setDescription('Leave the voice channel')
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case 'play':
          await interaction.deferReply();
          const queryParam = interaction.options.getString('query', true);
          await interaction.client.music.play(queryParam, interaction);
          break;

        case 'skip':
          await interaction.deferReply();
          await interaction.client.music.skip(interaction);
          break;

        case 'pause':
          await interaction.deferReply();
          await interaction.client.music.pause(interaction);
          break;

        case 'resume':
          await interaction.deferReply();
          await interaction.client.music.resume(interaction);
          break;

        case 'stop':
          await interaction.deferReply();
          await interaction.client.music.stop(interaction);
          break;

        case 'queue':
          await interaction.deferReply();
          await interaction.client.music.getQueue(interaction);
          break;

        case 'leave':
          await interaction.deferReply();
          if (!interaction.guild) {
            throw new Error('This command can only be used in a server.');
          }
          await interaction.client.music.leaveVoiceChannel(interaction.guild.id);
          await interaction.followUp('👋 Left the voice channel.');
          break;

        default:
          await interaction.reply({
            content: '❌ Unknown subcommand.',
            ephemeral: true
          });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred.';

      if (interaction.deferred) {
        await interaction.followUp({
          content: `❌ Error: ${errorMessage}`,
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: `❌ Error: ${errorMessage}`,
          ephemeral: true
        });
      }
    }
  }
};

export default command;
