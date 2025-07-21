/**
 * @file Ready event handler
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 */

import { Events, ActivityType } from 'discord.js';
import type { ClientEvent } from '~/types';

const event: ClientEvent<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    client.log.info(`Bot is online as ${client.user.tag}`);
    client.user.setActivity({
      type: ActivityType.Custom,
      name: 'Truyen oi anh yeu em ❤️'
    });
  }
};

export default event;
