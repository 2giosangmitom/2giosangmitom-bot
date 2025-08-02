FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY src/ ./src

# Enable corepack and install pnpm
RUN corepack enable && corepack install

# Install dependencies and build the application
RUN pnpm install && pnpm build

CMD [ "node", "dist/index.js" ]
