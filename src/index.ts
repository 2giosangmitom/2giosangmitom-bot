import { SapphireClient } from "@sapphire/framework";
import { GatewayIntentBits, REST, Routes } from "discord.js";
import "@sapphire/plugin-logger/register";
import { config } from "./config.js";

const client = new SapphireClient({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  logger: {
    level: process.env["LOG_LEVEL"] === "debug" ? 20 : 30,
  },
});

async function clearApplicationCommands(): Promise<void> {
  const rest = new REST().setToken(config.botToken);

  client.logger.info("Clearing old application commands...");

  // Clear global commands
  await rest.put(Routes.applicationCommands(config.clientId), { body: [] });

  client.logger.info("Old application commands cleared successfully.");
}

async function main(): Promise<void> {
  try {
    client.logger.info("Starting bot...");
    client.logger.info(`Client ID: ${config.clientId}`);
    client.logger.info(`Ollama URL: ${config.ollamaBaseUrl}`);

    // Clear old commands before login (which triggers command registration)
    await clearApplicationCommands();

    await client.login(config.botToken);

    client.logger.info("Bot successfully logged in!");
  } catch (error) {
    client.logger.fatal("Failed to start bot:", error);
    process.exit(1);
  }
}

main();
