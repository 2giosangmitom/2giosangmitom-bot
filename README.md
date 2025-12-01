# 🐕 2giosangmitom-bot

<div align="center">

![Stars](https://img.shields.io/github/stars/2giosangmitom/2giosangmitom-bot?style=for-the-badge&logo=apachespark&color=C9CBFF&logoColor=D9E0EE&labelColor=302D41)
![Last commit](https://img.shields.io/github/last-commit/2giosangmitom/2giosangmitom-bot?style=for-the-badge&logo=github&color=7dc4e4&logoColor=D9E0EE&labelColor=302D41)
![Forks](https://img.shields.io/github/forks/2giosangmitom/2giosangmitom-bot?style=for-the-badge&logo=starship&color=8bd5ca&logoColor=D9E0EE&labelColor=302D41)
![Issues](https://img.shields.io/github/issues/2giosangmitom/2giosangmitom-bot?style=for-the-badge&logo=lightning&color=8bd5ca&logoColor=D9E0EE&labelColor=302D41)
![Repo size](https://img.shields.io/github/repo-size/2giosangmitom/2giosangmitom-bot?color=%23DDB6F2&label=SIZE&logo=codesandbox&style=for-the-badge&logoColor=D9E0EE&labelColor=302D41)
![LICENSE](https://img.shields.io/github/license/2giosangmitom/2giosangmitom-bot?style=for-the-badge&logo=alpinedotjs&color=ee999f&logoColor=D9E0EE&labelColor=302D41)

✨ _"Solve problems. Stay motivated. Be unstoppable!"_ ✨

**Your adorable Discord companion for LeetCode practice and motivational boosts!**

</div>

---

## 💫 Features

<table>
<tr>
<td width="50%" valign="top">

### 🎯 Random LeetCode Questions

Get a surprise coding challenge whenever you need inspiration! Never run out of problems to solve.

</td>
<td width="50%" valign="top">

### ⚙️ Smart Filtering

Pick problems by difficulty or topic. Find exactly what you need to level up your skills!

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 💖 Motivation Boost

Stuck on a tough problem? Summon a cute anime waifu from [waifu.pics](https://waifu.pics/) to cheer you on!

</td>
<td width="50%" valign="top">

### 🕐 Auto Updates

Fresh LeetCode data every day at 2:00 AM UTC. Always stay up-to-date with the latest problems!

</td>
</tr>
</table>

---

## 🚀 Getting Started

### Prerequisites

Make sure you have [Bun](https://bun.sh/) (v1.0 or higher) installed.

First, create an `.env` file in the project root:

```env
TOKEN=your-bot-token
CLIENT_ID=your-application-id
```

### 🖋 Commands

| Task                 | Command             | Description                           |
| -------------------- | ------------------- | ------------------------------------- |
| Install dependencies | `bun install`       | Install all project dependencies      |
| Development mode     | `bun run dev`       | Start the bot in watch mode           |
| Start bot            | `bun run start`     | Start the bot in production mode      |
| Build                | `bun run build`     | Bundle the application for production |
| Type check           | `bun run typecheck` | Run TypeScript type checking          |
| Format code          | `bun run format`    | Format all source files with Prettier |
| Lint code            | `bun run lint`      | Lint all source files with ESLint     |

### 🐳 Docker

You can run the bot using Docker:

```bash
# Build the Docker image
docker build -t 2giosangmitom-bot .

# Run the container
docker run -d \
  -e TOKEN=your-bot-token \
  -e CLIENT_ID=your-application-id \
  --name 2giosangmitom-bot \
  2giosangmitom-bot
```

### 📦 Building for Production

The bot can be bundled for production using Bun:

```bash
# Bundle the application
bun run build

# Run the bundled application
bun run dist/index.js
```

## 🎨 Screenshots

<div align="center">

_When you encounter a hard problem, your waifu will boost your energy!_ 💪

![preview](./assets/preview.png)

</div>

---

## 🛠 Contributing

Feel free to open an issue or submit a pull request. All contributions are welcome! 🌸

---

## 🙏 Acknowledgements

<div align="center">

Thanks to all the amazing contributors 💛

[![Contributors](https://contrib.rocks/image?repo=2giosangmitom/2giosangmitom-bot)](https://github.com/2giosangmitom/2giosangmitom-bot/graphs/contributors)

</div>

Special thanks to the awesome libraries and APIs that power this bot:

| Name                                                     | Description                             |
| -------------------------------------------------------- | --------------------------------------- |
| 🥟 [Bun](https://bun.sh/)                                | A blazingly fast JavaScript runtime     |
| 🤖 [Discord.js](https://discord.js.org/)                 | The best Discord library for Node.js    |
| 🌸 [waifu.pics](https://waifu.pics/)                     | Cute anime images to keep us motivated! |
| 🧠 [GitHub Copilot](https://github.com/features/copilot) | My AI pair programmer bestie! 💜        |

---

<div align="center">

_Made with 💻 + 🍜 + lots of ☕ at 2AM_

**Happy coding, senpai!** 🎉

</div>
