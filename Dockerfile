FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package.json .
COPY bun.lock .
COPY tsconfig.json .
COPY src/ ./src

RUN apk add g++ make ffmpeg
RUN bun install --production
RUN bun run build

CMD [ "bun", "dist/index.js" ]