FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json .
COPY pnpm-lock.yaml .
COPY pnpm-workspace.yaml .
COPY tsconfig.json .
COPY src/ ./src

# Enable corepack and install pnpm
RUN corepack enable
RUN corepack install

# Install dependencies and build the application
RUN pnpm install
RUN pnpm build

CMD [ "node", "dist/index.js" ]