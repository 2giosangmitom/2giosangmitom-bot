import consola from 'consola';
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

const { TOKEN, CLIENT_ID } = process.env;
if (!TOKEN || !CLIENT_ID) {
  consola.error('Missing required env values');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});
client.commands = new Collection();

// Load slash commands
const commands = ['waifu.js', 'leetcode.js'];
for (const file of commands) {
  const mod = await import(`./commands/${file}`);
  client.commands.set(mod.default.data.name, mod.default);
  consola.success(`Loaded command: '${mod.default.data.name}' from 'commands/${file}'`);
}

// Register slash commands
try {
  const rest = new REST().setToken(TOKEN);
  const commandDatas = client.commands.map((cmd) => cmd.data.toJSON());
  consola.info(`Registering ${commandDatas.length} slash command(s)...`);
  const data = await rest.put(Routes.applicationCommands(CLIENT_ID), {
    body: commandDatas
  });
  consola.success(`Successfully registered ${data.length} command(s).`);
} catch (error) {
  consola.error(error);
}

// Handle ready event
client.once(Events.ClientReady, (readyClient) => {
  consola.success(`Logged in as ${readyClient.user.tag}`);
  readyClient.user.setActivity('Oi doi oi', {
    type: ActivityType.Custom
  });
});

// Handle interaction events
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) {
      consola.warn(`Unknown command: ${interaction.commandName}`);
      return;
    }

    try {
      consola.info(`Executing command: ${interaction.commandName}`);
      await command.execute(interaction);
      consola.success(`Command '${interaction.commandName}' executed successfully.`);
    } catch (error) {
      consola.error(`Error executing command '${interaction.commandName}':`, error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: 'There was an error while executing this command.',
          flags: MessageFlags.Ephemeral
        });
      } else {
        await interaction.reply({
          content: 'There was an error while executing this command.',
          flags: MessageFlags.Ephemeral
        });
      }
    }
  } else if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    if (!command || !command.data.options) {
      consola.warn(`Unknown autocomplete command: ${interaction.commandName}`);
      return;
    }

    try {
      consola.info(`Handling autocomplete for command: ${interaction.commandName}`);
      await command.autocomplete?.(interaction);
      consola.success(
        `Autocomplete for command '${interaction.commandName}' executed successfully.`
      );
    } catch (error) {
      consola.error(`Error handling autocomplete for command '${interaction.commandName}':`, error);
      await interaction.respond([]);
    }
  }
});

// Login to Discord
client.login(TOKEN).catch((error) => {
  consola.error('Failed to login:', error);
  process.exit(1);
});
