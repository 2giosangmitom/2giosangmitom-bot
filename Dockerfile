FROM node:22-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY src/ ./src

# Enable corepack and install pnpm
RUN corepack enable && corepack install

# Install dependencies
RUN pnpm install

CMD [ "node", "src/index.js" ]
