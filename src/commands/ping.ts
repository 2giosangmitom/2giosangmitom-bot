/**
 * @file Ping command
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 */

import { bold, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { SlashCommand } from '~/types';

const command: SlashCommand = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Get latency-related infomation'),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply('Pinging...');

    const sent = await interaction.fetchReply();
    const execTime = sent.createdTimestamp - interaction.createdTimestamp;
    const wsPing = interaction.client.ws.ping;

    await interaction.editReply({
      content: '',
      embeds: [
        new EmbedBuilder()
          .setTitle('🏓 Pong!')
          .addFields(
            { name: 'Execution time', value: bold(`${execTime} ms`), inline: true },
            {
              name: 'WebSocket ping',
              value: bold(`${wsPing} ms`),
              inline: true
            }
          )
          .setColor('Blue')
      ]
    });
  }
};

export default command;
