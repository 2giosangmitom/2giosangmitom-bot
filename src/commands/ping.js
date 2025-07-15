import { SlashCommandBuilder } from 'discord.js';

const data = new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong and latency info');

/**
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
async function execute(interaction) {
  await interaction.reply('Pinging...');

  const sent = await interaction.fetchReply();
  const roundTripLatency = sent.createdTimestamp - interaction.createdTimestamp;
  const wsPing = interaction.client.ws.ping;

  await interaction.editReply(
    `🏓 Pong!\n🏃 Round-trip latency: \`${roundTripLatency}ms\`\n🏃 WebSocket ping: \`${wsPing}ms\``
  );
}

export { data, execute };
