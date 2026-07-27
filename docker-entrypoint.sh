#!/bin/sh
# ============================================================================
# Script de inicialização do container Next.js
# 1. Aplica o schema do Prisma no SQLite (cria tabelas se não existirem)
# 2. Inicia o servidor Next.js em modo produção
# ============================================================================

set -e

echo "→ Aplicando schema do Prisma no banco de dados..."
bunx prisma db push --accept-data-loss --skip-generate

echo "→ Iniciando servidor Next.js na porta ${PORT:-3000}..."
exec node server.js
