import * as fs from 'node:fs';
import * as path from 'node:path';
import pino from 'pino';
import { Client, Events, GatewayIntentBits, ActivityType, Collection, MessageFlags, REST, Routes } from 'discord.js';

// Logger
const log = pino({
  transport: {
    target: 'pino-pretty'
  }
});

// Read and parse 'config.json' file to object
function getConfig() {
  const file = fs.readFileSync('./config.json', 'utf-8');
  return JSON.parse(file);
}

// Boot the bot
async function main() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  const { token, clientId } = getConfig();

  // Login
  client.login(token);

  // Commands
  client.commands = new Collection();

  const commandsDirPath = path.join(import.meta.dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsDirPath).filter((file) => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsDirPath, file);
    const command = await import(filePath);
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    } else {
      log.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }

  // Event handlers
  client.once(Events.ClientReady, async (readyClient) => {
    log.info(`Ready! Logged in as ${readyClient.user.tag}`);
    client.user.setActivity({
      type: ActivityType.Custom,
      name: 'Truyen oi anh yeu em ❤️'
    });

    // Register slash commands
    const rest = new REST().setToken(token);
    try {
      log.info(`Started refreshing ${client.commands.size} application (/) commands.`);

      // Collect data of all commands
      const commands = [];
      client.commands.forEach((value) => {
        commands.push(value.data.toJSON());
      });

      const data = await rest.put(Routes.applicationCommands(clientId), { body: commands });

      log.info(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
      log.error(error);
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      log.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      command.execute(interaction);
    } catch (error) {
      log.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: 'There was an error while executing this command!',
          flags: MessageFlags.Ephemeral
        });
      } else {
        await interaction.reply({
          content: 'There was an error while executing this command!',
          flags: MessageFlags.Ephemeral
        });
      }
    }
  });
}

main();
