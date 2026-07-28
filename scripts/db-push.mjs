// ============================================================================
// db-push.mjs — Aplica o schema Prisma no banco de dados
// usando o schema correto baseado na variável DATABASE_URL.
//
// - Se DATABASE_URL começa com "postgres": usa prisma/schema.prisma (PostgreSQL)
// - Se DATABASE_URL começa com "file:" ou não está definida: usa prisma/schema.sqlite.prisma (SQLite)
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
  execSync(
    `bunx prisma db push --accept-data-loss --schema=${schemaPath}`,
    { stdio: "inherit" }
  );
  console.log("✓ Schema aplicado ao banco de dados");
} catch (err) {
  console.error("✗ Falha ao aplicar schema:", err.message);
  process.exit(1);
}
