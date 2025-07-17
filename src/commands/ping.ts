import { type ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Get latency-related infomation');

/**
 * @description Get latency information and reply to user
 * @param interaction The slash command interaction object
 */
async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.reply('Pinging...');

  const sent = await interaction.fetchReply();
  const roundTripLatency = sent.createdTimestamp - interaction.createdTimestamp;
  const wsPing = interaction.client.ws.ping;

  await interaction.editReply(
    `🏓 Pong!\n🏃 Round-trip latency: \`${roundTripLatency}ms\`\n🏃 WebSocket ping: \`${wsPing}ms\``
  );
}

export { data, execute };
