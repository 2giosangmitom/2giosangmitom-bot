# 2giosangmitom-bot

A Discord bot built with Sapphire Framework and Ollama AI integration.

## Features

- 🤖 AI-powered chat using Ollama
- ⏱️ Response time measurement
- 📝 Beautiful structured logging
- 🔧 TypeScript with strict mode

## Prerequisites

- Node.js 25+
- npm
- Ollama running locally or remotely
- Discord Bot Token

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Required environment variables:

| Variable | Description |
|----------|-------------|
| `BOT_TOKEN` | Your Discord bot token |
| `CLIENT_ID` | Your Discord application client ID |
| `OLLAMA_BASE_URL` | Ollama API URL (e.g., `http://localhost:11434`) |

## Development

### Build

```bash
npm run build
```

### Type Check

```bash
npm run typecheck
```

### Run Tests

```bash
npm test
```

### Start Bot

```bash
npm start
```

### Development Mode

```bash
npm run dev
```

## Commands

### `/chat`

Chat with AI using Ollama.

**Options:**
- `prompt` (required): Your message to the AI
- `model` (optional): Ollama model to use (default: llama3.2)

**Example Response:**

```
🧠 AI Response (llama3.2)
⏱️ Response time: 1324 ms

Hello! I'm an AI assistant...
```

## Project Structure

```
.
├── src/
│   ├── commands/
│   │   └── ai/
│   │       └── chat.ts       # Chat command
│   ├── services/
│   │   └── ollama.service.ts # Ollama API client
│   ├── utils/
│   │   └── timer.ts          # Timing utilities
│   ├── config.ts             # Environment configuration
│   └── index.ts              # Bot entry point
├── test/
│   ├── commands/
│   │   └── chat.test.ts
│   ├── services/
│   │   └── ollama.test.ts
│   └── utils/
│       └── timer.test.ts
├── .github/
│   └── workflows/
│       └── ci.yml            # GitHub Actions CI
├── .env.example
├── .swcrc                    # SWC configuration
├── tsconfig.json             # TypeScript configuration
└── package.json
```

## Tech Stack

- **Runtime:** Node.js 25+
- **Language:** TypeScript (strict mode)
- **Framework:** Sapphire Framework
- **Discord Library:** discord.js
- **AI Backend:** Ollama
- **Build Tool:** SWC
- **Testing:** node:test

## License

MIT
