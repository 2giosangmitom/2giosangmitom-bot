import { config as loadEnv } from "dotenv";

loadEnv();

interface Config {
  botToken: string;
  clientId: string;
  ollamaBaseUrl: string;
}

function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function validateConfig(): Config {
  return {
    botToken: getEnvVar("BOT_TOKEN"),
    clientId: getEnvVar("CLIENT_ID"),
    ollamaBaseUrl: getEnvVar("OLLAMA_BASE_URL"),
  };
}

export const config: Config = validateConfig();
