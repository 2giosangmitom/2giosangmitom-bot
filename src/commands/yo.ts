import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';

const data = new SlashCommandBuilder()
  .setName('yo')
  .setDescription('Yo music chill command')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('play')
      .setDescription('Play a song from YouTube or other supported platforms')
      .addStringOption((option) =>
        option
          .setName('query')
          .setDescription('Song name, YouTube URL, or other supported URL')
          .setRequired(true)
      )
  );

/**
 * @description Execute music commands
 * @param interaction The slash command interaction object
 */
async function execute(interaction: ChatInputCommandInteraction<'cached'>) {}

export { data, execute };
