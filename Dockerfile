FROM node:24-alpine AS builder

WORKDIR /app
# Install dependencies
COPY package.json package-lock.json ./
RUN apk add g++ make python3
RUN npm install
COPY . .
RUN npm run build

FROM node:24-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
# Copy only necessary files for production
COPY package.json package-lock.json cookies.json ./
RUN apk add g++ make python3
RUN npm install --omit dev

CMD ["node", "dist/index.js"]