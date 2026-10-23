FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY entrypoint.sh ./entrypoint.sh
RUN npx prisma generate && \
    mkdir -p uploads && \
    chmod +x /app/entrypoint.sh && \
    chown -R node:node /app

# Sécurité CIS Docker Benchmark : exécution sous utilisateur non-root sans privilèges
USER node

# Respecte $PORT injecté par Render (fallback 3000 en local)
ENV PORT=${PORT:-3000}
EXPOSE ${PORT}

CMD ["/app/entrypoint.sh"]
