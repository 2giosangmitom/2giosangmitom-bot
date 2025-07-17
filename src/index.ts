/**
 * @file Entry point for the application.
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 * @license MIT
 */

import { log } from './constants';
import config from '../config.json';
import {
  Client,
  Events,
  GatewayIntentBits,
  ActivityType,
  Collection,
  Routes,
  REST,
  RESTPostAPIApplicationCommandsJSONBody
} from 'discord.js';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * @description Setup client, commands, and event handlers for the bot
 */
async function main() {
  // Initialize the client
  log.info('Initialize the client.');
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  const commands = new Collection<string, Command>();

  // Log in to Discord
  try {
    log.info('Log in to discord');
    client.login(config.token);
  } catch (error) {
    log.error(error);
  }

  // Client ready event
  client.once(Events.ClientReady, (readyClient) => {
    log.info(`Ready! Logged in as ${readyClient.user.tag}`);

    // Refresh slash commands
    registerSlashCommands(config.token, config.clientId, commands);

    // Set activity
    readyClient.user.setActivity({
      type: ActivityType.Custom,
      name: 'Truyen oi anh yeu em ❤️'
    });
  });
}

/**
 * @description Scan and register all commands in 'commands' directory
 * @param token The bot's token
 * @param clientId The bot's client id or application id
 * @param commands The commands collection
 */
async function registerSlashCommands(
  token: string,
  clientId: string,
  commands: Collection<string, Command>
) {
  // Collect all command files
  const cmdDir = path.join(__dirname, 'commands');
  const cmdFiles = (await fs.readdir(cmdDir, { encoding: 'utf-8' })).map((fileName) =>
    path.join(cmdDir, fileName)
  );

  // Create array of load command promises
  const cmdPromises = cmdFiles.map(async (filePath) => {
    try {
      const command = (await import(filePath)) as Command;

      if (command.data && typeof command.execute === 'function') {
        commands.set(command.data.name, command);
        log.info(`Command at ${filePath} loaded successfully`);
      } else {
        log.warn(`Command at ${filePath} is missing "data" or "execute"`);
      }
    } catch (error) {
      log.error(error);
    }
  });

  // Load all commands
  await Promise.all(cmdPromises);

  // Register slash commands
  const rest = new REST().setToken(token);
  const commandDatas = commands.map((cmd) => cmd.data.toJSON());

  try {
    log.info(`Refreshing ${commandDatas.length} application (/) commands...`);
    const data = (await rest.put(Routes.applicationCommands(clientId), {
      body: commandDatas
    })) as RESTPostAPIApplicationCommandsJSONBody[];
    log.info(`Successfully reloaded ${data.length} commands.`);
  } catch (error) {
    log.error(error);
  }
}

main();
