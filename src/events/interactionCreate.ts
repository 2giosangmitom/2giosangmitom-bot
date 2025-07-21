/**
 * @file Interaction create event handler
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 */

import { Events, MessageFlags, type InteractionReplyOptions } from 'discord.js';
import { type ClientEvent } from '~/types';

const event: ClientEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    const log = interaction.client.log;

    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) {
        await interaction.reply({
          content: `💀 No matching command for '${interaction.commandName}'`,
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      try {
        log.info(`Executing '${interaction.commandName}' command`);
        await command.execute(interaction);
      } catch (error) {
        log.error(error);

        const replyPayload: InteractionReplyOptions = {
          content:
            error instanceof Error
              ? `😭 ${error.message}`
              : '⚠️ There was an error while executing this command!',
          flags: MessageFlags.Ephemeral
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(replyPayload);
        } else {
          await interaction.reply(replyPayload);
        }
      }
    } else if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) {
        return;
      }

      try {
        if (command.autocomplete) {
          await command.autocomplete(interaction);
        }
      } catch (error) {
        log.error({ error }, `[Interaction] Error in command "${interaction.commandName}"`);
      }
    }
  }
};

export default event;
