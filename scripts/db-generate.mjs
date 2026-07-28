// ============================================================================
// db-generate.mjs — Gera o Prisma Client usando o schema correto
// baseado na variável DATABASE_URL.
//
// - Se DATABASE_URL começa com "postgres": usa prisma/schema.prisma (PostgreSQL)
// - Se DATABASE_URL começa com "file:" ou não está definida: usa prisma/schema.sqlite.prisma (SQLite)
//
// Isso permite que o mesmo código rode em:
//   - Sandbox/dev local sem Docker (SQLite)
//   - Produção com PostgreSQL (via Docker Compose ou Railway)
// ============================================================================

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const dbUrl = process.env.DATABASE_URL || "";
const isPostgres = dbUrl.startsWith("postgres");
const schemaPath = isPostgres
  ? "prisma/schema.prisma"
  : "prisma/schema.sqlite.prisma";

if (!existsSync(schemaPath)) {
  console.error(`✗ Schema não encontrado: ${schemaPath}`);
  process.exit(1);
}

console.log(
  `→ Detectado banco: ${isPostgres ? "PostgreSQL" : "SQLite"} (DATABASE_URL=${dbUrl || "(vazio)"})`
);
console.log(`→ Usando schema: ${schemaPath}`);

try {
  execSync(`bunx prisma generate --schema=${schemaPath}`, {
    stdio: "inherit",
  });
  console.log("✓ Prisma Client gerado com sucesso");
} catch (err) {
  console.error("✗ Falha ao gerar Prisma Client:", err.message);
  process.exit(1);
}
