#!/bin/bash
# ============================================================================
# Script de inicialização do PostgreSQL
# Cria bancos de dados adicionais para outros projetos que queiram compartilhar
# a mesma instância do PostgreSQL.
#
# Para adicionar um banco para outro projeto:
#   1. Edite este ficheiro
#   2. Adicione: createdb_if_not_exists "nome_do_banco"
#   3. Reinicie: docker compose down && docker compose up -d
# ============================================================================

set -e
set -u

# Função para criar banco se não existir
createdb_if_not_exists() {
  local db_name="$1"
  if psql -tAc "SELECT 1 FROM pg_database WHERE name='$db_name'" | grep -q 1; then
    echo "→ Banco '$db_name' já existe, pulando..."
  else
    echo "→ Criando banco '$db_name'..."
    createdb "$db_name"
    echo "✓ Banco '$db_name' criado"
  fi
}

# === Bancos para outros projetos (adicione os seus aqui) ===
# Exemplo:
# createdb_if_not_exists "outro_projeto_db"
# createdb_if_not_exists "analytics_db"

echo "✓ Inicialização do PostgreSQL concluída"
