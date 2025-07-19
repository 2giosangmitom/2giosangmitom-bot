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
async function execute(interaction: ChatInputCommandInteraction<'cached'>) {
  const subcommand = interaction.options.getSubcommand();
  const vc = interaction.member?.voice.channel;
  if (!vc) {
    throw new Error('You need to be in a voice channel to use this command!');
  }

  await interaction.deferReply();

  if (subcommand === 'play') {
    const query = interaction.options.getString('query', true);
    interaction.client.distube.play(vc, query, {
      textChannel: interaction.channel ?? undefined,
      member: interaction.member,
      metadata: { interaction }
    });
    const embed = new EmbedBuilder()
      .setColor('LuminousVividPink')
      .setDescription(`🎶 Playing music`);
    await interaction.followUp({ embeds: [embed] });
  }
}

export { data, execute };
