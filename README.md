<<<<<<< HEAD
# Mapa Mental Complexo com IA

Aplicação web para criação de **mapas mentais complexos** com assistência de **Inteligência Artificial**. Construída com Next.js 16, TypeScript, Prisma e shadcn/ui.

> Análise, correções e melhorias registradas em [`worklog.md`](./worklog.md) (Rodada 14).

---

## ✨ Funcionalidades

### Editor de mapas mentais
- **Canvas interativo** com pan, zoom, arrastar nós, ferramenta de conexão e seleção por caixa.
- **6 tipos de nós**: Conceito, Pergunta, Ação, Ideia, Recurso, Objetivo — cada um com cor, ícone e imagem opcionais.
- **10 algoritmos de layout** (árvores direcionais, balanceada, radial, grade, agrupado, camadas DAG) via painel dedicado (`Shift+L`).
- **Colapso/expandir** de subárvores, duplicação de nós, copy/paste (Ctrl+C/V), multi-seleção.
- **Undo/Redo** ilimitado (histórico de 50 passos) com atalhos `Ctrl+Z` / `Ctrl+Y`.

### Inteligência Artificial (z-ai-web-dev-sdk)
- **Expandir nó** — gera 5 conceitos-filho a partir de um tópico.
- **Gerar mapa completo** — cria um mapa inteiro a partir de um tema.
- **Resumir subárvore** — produz um resumo dos descendentes do nó.
- **Sugerir conexões** — propõe arestas entre nós existentes.
- **Chat assistente** — converse com a IA sobre o mapa em contexto.
- **Gerar imagem** — gera ilustrações para nós via IA.
- **Reorganizar layout** — auto-layout radial assistido por IA.

### Colaboração e partilha
- **Links de partilha só-leitura** (`?share=TOKEN`) — qualquer pessoa com o link pode ver o mapa.
- **Colaboração em tempo real** (presença + cursores remotos) via mini-service socket.io na porta 3003.

### Exportar / Importar
- **PNG** (alta resolução), **SVG**, **JSON** (com estrutura completa) e **Markdown** (árvore hierárquica).
- **Importar JSON** — carrega mapas exportados anteriormente.

### Experiência e acessibilidade
- **Paleta de comandos** (`Ctrl+K`) com busca fuzzy em nós e ações rápidas.
- **Painel de busca** (`Ctrl+F`) com substituição em massa.
- **Atalhos de teclado** documentados (`?`) — 25+ atalhos em 5 categorias.
- **Tooltips** em todos os botões da barra de ferramentas.
- **Tour de introdução** para novos utilizadores.
- **Tema claro/escuro/sistema** + 5 cores de destaque.
- **~30 toggles granulares** de funcionalidades (IA, visual, editor, performance, exportação).
- **PWA** instalável (manifest + service worker + ícones).
- **Responsivo** (mobile-first) com layout adaptativo.

---

## ⌨️ Atalhos principais

| Atalho | Ação |
|--------|------|
| `Ctrl+K` | Busca / comandos |
| `Ctrl+F` | Buscar nós (com substituição) |
| `Ctrl+Z` / `Ctrl+Y` | Desfazer / refazer |
| `Ctrl+D` | Duplicar nó selecionado |
| `Ctrl+C` / `Ctrl+V` | Copiar / colar nós |
| `Delete` / `Backspace` | Excluir nó (com confirmação opcional) |
| `L` | Alternar ferramenta Conectar |
| `Shift+L` | Painel de organização visual (layouts) |
| `↑ ↓ ← →` | Navegar pela árvore (pai/filho/irmãos) |
| `F` | Ajustar mapa à tela |
| `C P A I R O` | Adicionar Conceito/Pergunta/Ação/Ideia/Recurso/Objetivo |
| `E` / `Enter` | Editar nó selecionado |
| `Esc` | Cancelar seleção / conexão |

---

## 🛠️ Stack tecnológico

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Linguagem**: TypeScript 5
- **UI**: Tailwind CSS 4 + shadcn/ui (New York) + Lucide icons + Framer Motion
- **Estado**: Zustand (cliente) + TanStack Query (servidor)
- **Base de dados**: Prisma ORM (SQLite em dev, PostgreSQL em produção)
- **IA**: z-ai-web-dev-sdk (LLM, VLM, geração de imagens)
- **Tempo real**: socket.io (mini-service dedicado, porta 3003)
- **PWA**: manifest + service worker com cache offline

---

## 🚀 Instalação e execução

### Pré-requisitos
- [Bun](https://bun.sh/) 1.3+ (ou Node.js 20+)
- Nenhuma base de dados externa necessária (SQLite em ficheiro)

### Passos (desenvolvimento)
```bash
# 1. Instalar dependências
bun install

# 2. Configurar a base de dados (SQLite automático)
bun run db:push

# 3. Iniciar o servidor de desenvolvimento
bun run dev          # http://localhost:3000

# 4. (Opcional) Iniciar o serviço de colaboração em tempo real
cd mini-services/collab-service && bun install && bun run dev   # porta 3003
```

### Scripts disponíveis
| Script | Descrição |
|--------|-----------|
| `bun run dev` | Servidor de desenvolvimento (porta 3000) |
| `bun run build` | Build de produção (standalone) |
| `bun run start` | Servidor de produção |
| `bun run lint` | ESLint |
| `bun run db:push` | Aplicar schema Prisma à base de dados |
| `bun run db:generate` | Regenerar cliente Prisma |

---

## 📁 Estrutura do projeto

```
.
├── src/
│   ├── app/                    # Rotas Next.js (App Router)
│   │   ├── page.tsx            # Página única (editor + modo share)
│   │   ├── api/                # API routes (maps, ai, share)
│   │   └── layout.tsx          # Layout raiz + metadata PWA
│   ├── components/
│   │   ├── mindmap/            # 25+ componentes do editor
│   │   ├── ui/                 # shadcn/ui (60+ componentes)
│   │   └── pwa/                # Service worker register
│   ├── store/                  # Zustand (mindmap + settings)
│   ├── hooks/                  # collab, autosave, toast, tool-context
│   └── lib/                    # ai, db, layout-algorithms, templates, types
├── prisma/
│   ├── schema.prisma           # PostgreSQL (produção)
│   └── schema.sqlite.prisma    # SQLite (dev/sandbox)
├── mini-services/
│   └── collab-service/         # socket.io na porta 3003
├── public/                     # ícones PWA, sw.js, robots.txt
├── scripts/                    # db-push / db-generate (auto-detect)
├── Dockerfile                  # deploy multi-stage (standalone)
├── docker-compose.yml          # PostgreSQL + web + collab
└── worklog.md                  # Registo completo de desenvolvimento
```

---

## 🩺 Rodada 14 — Análise, correções e melhorias

Esta rodada realizou uma **auditoria de código completa** que identificou **13 bugs críticos** e **20 bugs menores**, seguida de correções e melhorias.

### Bugs críticos corrigidos
1. **Delete não era desfezível** — `pushHistory()` agora é chamado antes de excluir nós (teclado + toolbar + context menu).
2. **`focusNode` reiniciava o zoom** ao adicionar/focar um nó — agora preserva o zoom atual.
3. **Histórico por keystroke no NodeEditor** — digitar 10 caracteres criava 10 entradas de undo; agora há debounce de 1.5s + reset ao trocar de nó.
4. **Renomear mapa destruía todos os nós/arestas** — o fluxo PUT apagava e recriava tudo; criado endpoint `PATCH /api/maps/[id]` para updates de metadata-only.
5. **Loop infinito em `/api/ai/generate`** com grafos cíclicos — adicionado `visited` set ao BFS de layout.
6. **Matemática de colisão em `organizeLayout` errada** — parênteses em falta produziam deteção incorreta; corrigido com centros calculados explicitamente.
7. **`organizeLayout` não era desfezível** — adicionado `pushHistory()`.
8. **Ações de IA (expand/generate/layout) não eram desfezíveis** — adicionado `pushHistory()` em cada uma.
9. **Tooltips da toolbar invisíveis** — `data-tooltip` não tinha CSS; adicionado sistema de tooltips completo no `globals.css`.
10. **`handleSummarize` percorria arestas em ambas direções** — resumia ancestrais + irmãos em vez de descendentes; corrigido para descendentes apenas.
11. **Link "partilhar nó" dava 404** — apontava para rota inexistente `/map/:id/node/:nodeId`; agora gera `?node=NODEID` com handling no `page.tsx`.
12. **`confirmDelete` silenciava o Delete sem feedback** — agora abre um `AlertDialog` de confirmação.
13. **Autosave deixava `saving=true` para sempre em caso de erro** — adicionado `finally { setSaving(false) }`.

### Bugs menores corrigidos
- `duplicateNode` agora também duplica arestas incidentais (a cópia mantinha-se desconectada).
- `toggleCollapse` tornou-se desfezível (`pushHistory` interno).
- `Backspace` agora chama `preventDefault()` (evita history-back do browser).
- `Sidebar` chamava `setState` durante o render — movido para `useEffect`.
- `maxNodes` (Settings → Performance) agora é efetivamente aplicado em `addNode`.

### Novas funcionalidades
- **Atalho `L`** para alternar a ferramenta Conectar (o tooltip já anunciava "(L)" mas não havia handler).
- **Copy/Paste de nós** (`Ctrl+C` / `Ctrl+V`) com clipboard em memória.
- **Navegação por setas** (`↑` pai, `↓` filho, `←/→` irmãos) com foco automático.
- **Deep-link para nó específico** (`?node=NODEID`) — seleciona e foca o nó ao carregar.
- **`AlertDialog` de confirmação de exclusão** quando a setting `confirmDelete` está ativa.
- **Tooltips acessíveis** (hover + focus-visible) com posicionamento configurável.

### Documentação
- `ShortcutsPanel` atualizado com os 5 novos atalhos.
- Este README expandido com funcionalidades, stack e estrutura.
- `worklog.md` atualizado com o registo completo da Rodada 14.

### Estado final
- **Lint**: 0 erros, 0 warnings ✓
- **QA (agent-browser)**: página carrega, nós adicionáveis via teclado, ferramenta Conectar funcional, LayoutPanel com 10 layouts em 4 categorias, settings panel completo, sem erros de runtime ✓
- **Erros tsc pré-existentes** (MapEdges foreignObject, NodeEditor icon, use-collab, use-toast-notify) — não bloqueantes, documentados.

---

## 📖 Documentação adicional

- [`DEPLOY.md`](./DEPLOY.md) — Guia de deploy (Docker Compose / Railway / PWA offline)
- [`INSTALACAO.md`](./INSTALACAO.md) — Guia de instalação no notebook (Docker Desktop ou Bun + SQLite)
- [`worklog.md`](./worklog.md) — Registo completo de desenvolvimento (14 rodadas)
- [`mini-services/collab-service/README.md`](./mini-services/collab-service/README.md) — Protocolo socket.io

---

## 📄 Licença

Projeto de uso livre.
=======
# Mapa-Mental-Complexo-com-IA
>>>>>>> origin/main
