/**
 * @author Vo Quang Chien <voquangchien.dev@proton.me>
 * @license MIT
 * @copyright © 2025 Vo Quang Chien
 */

import { pino } from 'pino';
import config from '../config.json';
import {
  Client,
  Events,
  GatewayIntentBits,
  ActivityType,
  Collection,
  Routes,
  REST,
  RESTPostAPIApplicationCommandsJSONBody,
  InteractionReplyOptions,
  MessageFlags
} from 'discord.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { replyMessage } from './services/auto-response';
import { validateData, downloadData } from '~/services/leetcode';

/** @description Pino logger instance */
const log = pino({
  transport: {
    target: 'pino-pretty'
  },
  level: 'debug'
});

/**
 * Initializes the Discord client and sets up commands and event handlers
 */
async function main() {
  log.info('[Startup] Initializing Discord client...');
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates
    ]
  });

  client.commands = new Collection<string, Command>();

  try {
    await client.login(config.token);
    log.info('[Startup] Logged in to Discord successfully.');
  } catch (error) {
    log.error({ err: error }, '[Startup] Failed to log in to Discord.');
    process.exit(1);
  }

  client.once(Events.ClientReady, async (readyClient) => {
    log.info(`[Ready] Bot is online as ${readyClient.user.tag}`);

    await registerSlashCommands(config.token, config.clientId, client.commands);

    readyClient.user.setActivity({
      type: ActivityType.Custom,
      name: 'Truyen oi anh yeu em ❤️'
    });

    log.info('[Ready] Bot presence/activity set.');
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        const warnMsg = `[Interaction] No matching command for "${interaction.commandName}"`;
        log.warn(warnMsg);
        await interaction.reply({ content: warnMsg, flags: MessageFlags.Ephemeral });
        return;
      }

      try {
        log.info(`[Interaction] Executing command: ${interaction.commandName}`);
        await command.execute(interaction);
      } catch (error) {
        const userMessage = '⚠️ There was an error while executing this command!';
        log.error({ err: error }, `[Interaction] Error in command "${interaction.commandName}"`);

        const replyPayload: InteractionReplyOptions = {
          content: error instanceof Error ? `😭 ${error.message}` : userMessage,
          flags: MessageFlags.Ephemeral
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(replyPayload);
        } else {
          await interaction.reply(replyPayload);
        }
      }
    } else if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        log.warn(`[Interaction] No matching command for "${interaction.commandName}"`);
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
  });

  // Handle auto-response for normal messages
  client.on(Events.MessageCreate, (message) => {
    if (message.author.bot) return;

    const res = replyMessage(message.content);
    if (res) {
      message
        .reply({
          content: res,
          allowedMentions: { repliedUser: false }
        })
        .catch((error) => log.error({ err: error }, '[MessageCreate] Failed to reply to user.'));
    }
  });
}

/**
 * @description Loads and registers all slash commands from the commands directory.
 * @param token The bot's token.
 * @param clientId The bot's client id/application id.
 * @param commands The command collection.
 */
async function registerSlashCommands(
  token: string,
  clientId: string,
  commands: Collection<string, Command>
) {
  const cmdDir = path.join(__dirname, 'commands');
  let cmdFiles: string[] = [];

  try {
    cmdFiles = (await fs.readdir(cmdDir)).map((file) => path.join(cmdDir, file));
    log.info(`[CommandLoader] Found ${cmdFiles.length} command file(s).`);
  } catch (error) {
    log.error({ err: error }, '[CommandLoader] Failed to read commands directory.');
    return;
  }

  const loadPromises = cmdFiles.map(async (filePath) => {
    try {
      const command = (await import(filePath)) as Command;

      if (command.data && typeof command.execute === 'function') {
        commands.set(command.data.name, command);
        log.info(
          `[CommandLoader] Loaded command "${command.data.name}" from ${path.basename(filePath)}`
        );
      } else {
        log.warn(
          `[CommandLoader] Skipped invalid command in ${path.basename(filePath)} (missing data/execute).`
        );
      }
    } catch (error) {
      log.error({ err: error }, `[CommandLoader] Failed to load command from ${filePath}.`);
    }
  });

  await Promise.all(loadPromises);

  const rest = new REST().setToken(token);
  const commandDatas = commands.map((cmd) => cmd.data.toJSON());

  try {
    log.info(`[CommandRegister] Registering ${commandDatas.length} slash command(s)...`);
    const data = (await rest.put(Routes.applicationCommands(clientId), {
      body: commandDatas
    })) as RESTPostAPIApplicationCommandsJSONBody[];

    log.info(`[CommandRegister] Successfully registered ${data.length} command(s).`);
  } catch (error) {
    log.error({ err: error }, '[CommandRegister] Failed to register slash commands.');
  }
}

/**
 * @description Ensures LeetCode data is cached and valid, or fetches it.
 */
async function initializeData() {
  log.info('[Cache] Validating cached data...');
  const valid = await validateData();

  if (valid) {
    log.info('[Cache] Cache is valid. No need to re-fetch.');
    return;
  } else {
    log.warn('[Cache] Cache is not found or is invalid. Re-downloading data...');
  }
  await downloadData();
  log.info('[Cache] LeetCode data downloaded and cached.');
}

// Exit if don't have cache data.
initializeData().catch((error) => {
  log.fatal({ error }, '[Fatal] Failed to initialize data. Exitting.');
  process.exit(1);
});

// Start the bot
log.info('Starting 2giosangmitom-bot...');
main().catch((error) => {
  log.fatal({ error }, '[Fatal] Uncaught exception in main(). Exitting.');
  process.exit(1);
});

// Handle SIGINT signal
process.once('SIGINT', (signal) => {
  log.info(`[Signal] Received ${signal} signal. Exitting.`);
  process.exit(0);
});
