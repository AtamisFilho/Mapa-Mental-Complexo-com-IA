# syntax=docker/dockerfile:1
# ============================================================================
# Mapa Mental Complexo com IA — Dockerfile para o app Next.js principal
# Otimizado para Railway (suporta volume persistente para SQLite)
# ============================================================================

# ---------- Stage 1: instalar dependências ----------
FROM oven/bun:1 AS deps
WORKDIR /app

# Aproveita cache do Docker: copia só os manifestos primeiro
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---------- Stage 2: build ----------
FROM oven/bun:1 AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Gera o client do Prisma (necessário antes do build do Next.js)
RUN bunx prisma generate

# Build de produção do Next.js (output: standalone)
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# ---------- Stage 3: runtime (imagem final enxuta) ----------
FROM oven/bun:1 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Caminho do SQLite dentro do volume persistente (montado pelo Railway)
ENV DATABASE_URL=file:/app/data/mindmap.db

# Cria o diretório de dados (será sobrescrito pelo volume mount em produção)
RUN mkdir -p /app/data

# Copia o build standalone do Next.js
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copia o schema do Prisma + cliente gerado (necessário para `prisma db push` em runtime)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Script de inicialização: aplica o schema no DB e sobe o servidor
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3000

# Healthcheck: verifica se a API responde
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/maps > /dev/null || exit 1

CMD ["/app/docker-entrypoint.sh"]
