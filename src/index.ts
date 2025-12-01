import {
  ActivityType,
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  MessageFlags,
  REST,
  Routes
} from 'discord.js';
import { env } from './lib/env';
import { createLogger } from './lib/logger';
import { type Command, COMMAND_MODULES } from './lib/types';

const logger = createLogger('Bot');

// Extended client with commands collection
interface ExtendedClient extends Client {
  commands: Collection<string, Command>;
}

async function loadCommands(client: ExtendedClient): Promise<void> {
  logger.info('Loading commands...');

  for (const name of COMMAND_MODULES) {
    try {
      const mod = await import(`./commands/${name}`);
      const command = mod.default as Command;
      client.commands.set(command.data.name, command);
      logger.info(`Loaded command: ${command.data.name}`);
    } catch (error) {
      logger.error(`Failed to load command: ${name}`, error);
      throw error;
    }
  }

  logger.info(`Loaded ${client.commands.size} commands`);
}

async function registerCommands(client: ExtendedClient): Promise<void> {
  const rest = new REST().setToken(env.TOKEN);
  const commandData = client.commands.map((cmd) => cmd.data.toJSON());

  logger.info(`Registering ${commandData.length} slash commands...`);

  const result = (await rest.put(Routes.applicationCommands(env.CLIENT_ID), {
    body: commandData
  })) as unknown[];

  logger.info(`Registered ${result.length} commands with Discord`);
}

function setupEventHandlers(client: ExtendedClient): void {
  client.once(Events.ClientReady, (readyClient) => {
    logger.info(`Bot is ready! Logged in as ${readyClient.user.tag}`);
    readyClient.user.setActivity('Oi doi oi', { type: ActivityType.Custom });
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        logger.warn(`Unknown command received: ${interaction.commandName}`);
        return;
      }

      try {
        logger.debug(`Executing command: ${interaction.commandName}`, {
          userId: interaction.user.id,
          guildId: interaction.guildId
        });

        await command.execute(interaction);

        logger.debug(`Command executed successfully: ${interaction.commandName}`);
      } catch (error) {
        logger.error(`Command execution failed: ${interaction.commandName}`, error);

        const errorMessage = 'There was an error while executing this command.';

        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
              content: errorMessage,
              flags: MessageFlags.Ephemeral
            });
          } else {
            await interaction.reply({
              content: errorMessage,
              flags: MessageFlags.Ephemeral
            });
          }
        } catch (replyError) {
          logger.error('Failed to send error response', replyError);
        }
      }
    } else if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);

      if (!command?.autocomplete) {
        return;
      }

      try {
        await command.autocomplete(interaction);
      } catch (error) {
        logger.error(`Autocomplete failed: ${interaction.commandName}`, error);
        await interaction.respond([]).catch(() => {});
      }
    }
  });

  client.on(Events.Error, (error) => {
    logger.error('Discord client error', error);
  });
}

async function main(): Promise<void> {
  logger.info('Starting bot...', { nodeEnv: env.NODE_ENV });

  const client = new Client({
    intents: [GatewayIntentBits.Guilds]
  }) as ExtendedClient;

  client.commands = new Collection();

  try {
    await loadCommands(client);
    await registerCommands(client);
    setupEventHandlers(client);

    await client.login(env.TOKEN);
  } catch (error) {
    logger.error('Failed to start bot', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', reason);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

main();
