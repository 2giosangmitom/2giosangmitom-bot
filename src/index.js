import fastify from 'fastify';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import * as fs from 'node:fs/promises';

// Create fake server
const app = fastify({
  logger: {
    transport: {
      target: 'pino-pretty'
    }
  }
});

app.get('/', (request, reply) => {
  reply.type('text/html');
  const file = fs.readFile('./src/index.html', { encoding: 'utf-8' });
  return file;
});

app.listen({
  host: '0.0.0.0',
  port: 3000
});

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (readyClient) => {
  app.log.info(`Ready! Logged in as ${readyClient.user.tag}`);
});

const { BOT_TOKEN, CLIENT_ID } = process.env;

client.login(BOT_TOKEN);
