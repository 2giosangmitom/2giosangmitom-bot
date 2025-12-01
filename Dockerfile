# Stage 1: Build
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Bundle the application
RUN bun run build

# Stage 2: Production
FROM oven/bun:1-slim AS runner

WORKDIR /app

# Copy bundled files from builder
COPY --from=builder /app/dist ./dist

# Create cache directory
RUN mkdir -p /app/.cache

# Set environment
ENV NODE_ENV=production

# Run the bot
CMD ["bun", "run", "dist/index.js"]
