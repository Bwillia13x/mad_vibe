# Multi-stage build for Andreas Vibe

FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

# Copy built artifacts and production deps
COPY --from=deps /app/dist ./dist
COPY --from=deps /app/package*.json ./
RUN npm ci --omit=dev

CMD ["node", "dist/index.js"]

