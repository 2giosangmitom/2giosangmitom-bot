import * as fs from 'node:fs';
import pino from 'pino';
import { Client, Events, GatewayIntentBits } from 'discord.js';

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
  const { token } = getConfig();

  // Login
  client.login(token);

  // Event handlers
  client.once(Events.ClientReady, (readyClient) => {
    log.info(`Ready! Logged in as ${readyClient.user.tag}`);
  });
}

main();
