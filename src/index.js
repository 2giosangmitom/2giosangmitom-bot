import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pino } from 'pino';
import { Client, Events, GatewayIntentBits, ActivityType, Collection, MessageFlags, REST, Routes } from 'discord.js';
import { response } from './services/auto-response.js';
import { initializeData } from './services/leetcode.js';

// Globals
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Logger instance using pino-pretty
const log = pino({
  transport: {
    target: 'pino-pretty'
  }
});

/**
 * Reads and parses the config.json file.
 * Exits the process if required fields are missing or file is invalid.
 * @returns {{ token: string, clientId: string }} Parsed config object
 */
function getConfig() {
  try {
    const raw = fs.readFileSync('./config.json', 'utf-8');
    const config = JSON.parse(raw);
    if (!config.token || !config.clientId) {
      throw new Error('Missing required fields in config.json');
    }
    return config;
  } catch (err) {
    log.error(err);
    process.exit(1);
  }
}

/**
 * Registers all slash commands for the bot with Discord.
 * @param {Client} client - The Discord client
 * @param {string} token - Bot token
 * @param {string} clientId - Application client ID
 * @returns {Promise<void>}
 */
async function registerSlashCommands(client, token, clientId) {
  const rest = new REST().setToken(token);
  const commands = client.commands.map((cmd) => cmd.data.toJSON());

  try {
    log.info(`Refreshing ${commands.length} application (/) commands...`);
    const data = await rest.put(Routes.applicationCommands(clientId), { body: commands });
    // @ts-ignore
    log.info(`Successfully reloaded ${data.length} commands.`);
  } catch (err) {
    log.error(err);
  }
}

/**
 * Loads command modules from the given directory into the client's command collection.
 * Skips invalid modules that don't export both `data` and `execute`.
 * @param {string} commandsDir - Path to the commands directory
 * @param {Client} client - The Discord client
 * @returns {Promise<void>}
 */
async function loadCommands(commandsDir, client) {
  const commandFiles = fs.readdirSync(commandsDir).filter((f) => f.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsDir, file);
    const command = await import(filePath);
    if (command?.data && typeof command.execute === 'function') {
      client.commands.set(command.data.name, command);
      log.info(`Command at ${filePath} loaded successfully`);
    } else {
      log.warn(`Command at ${filePath} is missing "data" or "execute"`);
    }
  }
}

/**
 * Main entry point for the bot. Initializes the Discord client,
 * loads commands, registers event listeners, and starts the bot.
 * @returns {Promise<void>}
 */
async function main() {
  const { token, clientId } = getConfig();

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
  });

  client.commands = new Collection();

  // Load commands from /commands directory
  const commandsPath = path.join(__dirname, 'commands');
  await loadCommands(commandsPath, client);

  // Set activity and register commands when bot is ready
  client.once(Events.ClientReady, async (readyClient) => {
    log.info(`Ready! Logged in as ${readyClient.user.tag}`);
    readyClient.user.setActivity({
      type: ActivityType.Custom,
      name: 'Truyen oi anh yeu em ❤️'
    });

    await registerSlashCommands(client, token, clientId);
  });

  // Handle slash command interactions
  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        log.error(`No matching command for: ${interaction.commandName}`);
        return;
      }

      try {
        log.info(`Executing ${command.data.name} command`);
        await command.execute(interaction);
      } catch (error) {
        let errorMsg = '⚠️ There was an error while executing this command!';
        if (error instanceof Error) {
          errorMsg = error.message; // More user-friendly message
        }

        /** @type {import('discord.js').InteractionReplyOptions} */
        const replyPayload = {
          content: errorMsg,
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
        log.error(`No matching command for: ${interaction.commandName}`);
        return;
      }

      try {
        if (command.autocomplete) {
          await command.autocomplete(interaction);
        }
      } catch (error) {
        log.error(error);
      }
    }
  });

  // Handle auto-response for normal messages
  client.on(Events.MessageCreate, (message) => {
    if (message.author.bot) return;

    const res = response(message.content.toLowerCase());
    if (res) {
      message.reply(res).catch((err) => log.error(err));
    }
  });

  // Log in to Discord
  try {
    await client.login(token);
  } catch (err) {
    log.error(err);
    process.exit(1);
  }
}

// Initialize LeetCode data
initializeData(log)
  .then(() => {
    log.info('Initialized LeetCode data successfully');
  })
  .catch((err) => {
    log.error(err);
  });

main();
