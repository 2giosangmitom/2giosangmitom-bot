/**
 * @file Entry point of the project
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 */

import {
  Client,
  Collection,
  GatewayIntentBits,
  REST,
  Routes,
  type ClientEvents,
  type RESTPostAPIApplicationCommandsJSONBody
} from 'discord.js';
import pino from 'pino';
import fs from 'node:fs';
import path from 'node:path';
import type { SlashCommand, ClientEvent } from '~/types';
import LeetCodeService from '~/services/leetcode';
// import MusicService from '~/services/music';

async function main() {
  // Check required environment variables
  const { TOKEN, CLIENT_ID } = Bun.env;
  if (!TOKEN || !CLIENT_ID) {
    throw new Error(`Required environment variables are not set: 'TOKEN' or 'CLIENT_ID'`);
  }

  // Initialize discord.js client
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
  });

  // Logger object
  client.log = pino({
    transport: {
      target: 'pino-pretty'
    }
  });

  // Leetcode
  client.leetcode = new LeetCodeService(client);

  // Slash commands
  client.commands = new Collection<string, SlashCommand>();

  // Music
  // client.music = new MusicService(client);

  // Load event handlers
  const eventsDir = `${import.meta.dirname}/events`;
  const eventFiles = fs.readdirSync(eventsDir, 'utf-8').filter((file) => file.match(/\.js$|\.ts$/));

  for (const file of eventFiles) {
    const eventPath = path.join(eventsDir, file);
    const mod = (await import(eventPath)) as {
      default: ClientEvent<keyof ClientEvents>;
    };

    const eventRelativePath = path.relative(process.cwd(), eventPath);
    if (
      typeof mod.default === 'object' &&
      mod.default.name &&
      typeof mod.default.execute === 'function'
    ) {
      client.log.info(`Loading '${mod.default.name}' at '${eventRelativePath}' event`);

      if (mod.default.once) {
        client.once(mod.default.name, mod.default.execute);
        client.log.info(`Registered '${mod.default.name}' as a one-time event handler`);
      } else {
        client.on(mod.default.name, mod.default.execute);
        client.log.info(`Registered '${mod.default.name}' as a persistent event handler`);
      }
    } else {
      client.log.warn(`Event handler at '${eventRelativePath}' is not valid`);
    }
  }

  // Load bot's commands
  const commandsDir = `${import.meta.dirname}/commands`;
  const commandFiles = fs
    .readdirSync(commandsDir, 'utf-8')
    .filter((file) => file.match(/\.js$|\.ts$/));

  for (const file of commandFiles) {
    const commandPath = path.join(commandsDir, file);
    const mod = (await import(commandPath)) as { default: SlashCommand };

    const commandRelativePath = path.relative(process.cwd(), commandPath);
    if (
      typeof mod.default === 'object' &&
      mod.default.data &&
      typeof mod.default.execute === 'function'
    ) {
      client.log.info(`Loading '${mod.default.data.name}' command at '${commandRelativePath}'`);
      client.commands.set(mod.default.data.name, mod.default);
    } else {
      client.log.warn(`Command at '${commandRelativePath}' is not valid`);
    }
  }

  try {
    // Register commands
    const rest = new REST().setToken(TOKEN);
    const commandDatas = client.commands.map((cmd) => cmd.data.toJSON());
    client.log.info(`Registering ${commandDatas.length} slash command(s)...`);
    const data = (await rest.put(Routes.applicationCommands(CLIENT_ID), {
      body: commandDatas
    })) as RESTPostAPIApplicationCommandsJSONBody[];
    client.log.info(`Successfully registered ${data.length} command(s).`);
  } catch (error) {
    client.log.error(error);
  }

  // Log in to Discord
  client.login(TOKEN);

  // Graceful shutdown handling
  const gracefulShutdown = () => {
    client.log.info('Shutting down gracefully...');

    // Cleanup music service
    if (client.music) {
      client.music.destroy();
      client.log.info('Music service cleaned up.');
    }

    // Destroy client
    client.destroy();
    client.log.info('Discord client destroyed.');

    process.exit(0);
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
}

main();
