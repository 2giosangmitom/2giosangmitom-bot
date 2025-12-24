# 2giosangmitom-bot

A personal Discord bot for LeetCode practice, anime images, and AI chat.

## Features

### 🧠 LeetCode Random Problem

- Fetches free LeetCode problems via GraphQL API
- Caches problems in `data/leetcode.json` and memory
- Daily automatic refresh at 2:00 AM via cron job
- Optional filtering by difficulty (Easy / Medium / Hard)
- Topic category autocomplete powered by Fuse.js
- Shows motivational waifu image for Hard problems

### 🎨 Waifu Images

- Random anime images from [waifu.pics](https://waifu.pics)
- SFW categories only
- Category selection via slash command

### 🤖 AI Chat

- Local AI chat via [Ollama](https://ollama.ai)
- Supports `llama3.2:3b` and `qwen2.5:3b` models
- Stateless (no conversation memory)

## Tech Stack

- **Runtime**: Node.js 25+
- **Language**: TypeScript (strict mode)
- **Framework**: Sapphire Framework + discord.js
- **AI**: Ollama (local)
- **Build**: SWC
- **Testing**: node:test
- **Other**: Fuse.js, node-cron

## Setup

```bash
# Clone repository
git clone https://github.com/2giosangmitom/2giosangmitom-bot.git
cd 2giosangmitom-bot

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your values

# Build
npm run build

# Start
npm start
```

## Environment Variables

| Variable          | Description                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| `BOT_TOKEN`       | Discord bot token from [Discord Developer Portal](https://discord.com/developers/applications) |
| `CLIENT_ID`       | Discord application client ID                                                                  |
| `OLLAMA_BASE_URL` | Ollama API endpoint (e.g., `http://localhost:11434`)                                           |

## Commands

| Command     | Description                                                                   |
| ----------- | ----------------------------------------------------------------------------- |
| `/chat`     | Chat with Ollama AI. Options: `prompt` (required), `model` (optional)         |
| `/waifu`    | Get random anime image. Options: `category` (optional)                        |
| `/leetcode` | Get random LeetCode problem. Options: `difficulty`, `category` (autocomplete) |

## Project Structure

```
src/
├── commands/
│   ├── ai/
│   │   └── chat.ts
│   └── fun/
│       ├── leetcode.ts
│       └── waifu.ts
├── services/
│   ├── leetcode.service.ts
│   ├── ollama.service.ts
│   └── waifu.service.ts
├── jobs/
│   └── leetcode-refresh.job.ts
├── utils/
│   ├── leetcode-category-fuse.ts
│   ├── message.ts
│   └── timer.ts
├── config.ts
└── index.ts

data/
└── leetcode.json

test/
├── commands/
├── jobs/
├── services/
└── utils/
```

## Design Principles

- **Local-first**: Ollama runs locally, no external AI APIs
- **No database**: JSON file + in-memory cache
- **Minimal scope**: Three features, done well
- **Fast**: In-memory problem cache for instant responses
- **Personal use**: Optimized for single-user productivity
