# syntax=docker/dockerfile:1
# ============================================================================
# collab-service — Dockerfile para o mini-service de colaboração (socket.io)
# Deploya como um serviço separado no Railway
# ============================================================================

FROM oven/bun:1 AS base
WORKDIR /app

# Instala dependências
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copia o código
COPY . .

# Build não é necessário — Bun roda TypeScript diretamente
EXPOSE 3003

# Healthcheck via endpoint HTTP (socket.io responde a GET /)
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3003}/ > /dev/null || exit 1

CMD ["bun", "run", "start"]
