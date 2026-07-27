# 🚀 Guia de Deploy — Mapa Mental Complexo com IA

Este guia cobre **3 cenários** — escolha o que se adapta a você:

| Cenário | Quando usar | Custo |
|---------|-------------|-------|
| **🅰️ Docker Compose** (RECOMENDADO para si) | Quer rodar no seu próprio servidor, compartilhar PostgreSQL com outros projetos | ~$5/mês (VPS) |
| **🅱️ Railway** (nuvem simples) | Prefere não mexer com servidor, deploy com 2 cliques | free trial → ~$5/mês |
| **🅲️ Teste Offline (PWA)** | Testar no seu PC e Android ANTES de publicar | grátis |

> 👶 **Escrito para iniciantes** — não precisa saber programar. Siga os passos em ordem.

---

## 🅰️ Docker Compose (RECOMENDADO para si)

Esta é a melhor opção para você porque:
- ✅ **Compartilha o mesmo PostgreSQL** com seus outros projetos mais complexos
- ✅ Roda no seu próprio servidor (controle total)
- ✅ Funciona offline (para testes antes de publicar)
- ✅ É a configuração que você já planejou usar

### Pré-requisitos

1. **Docker** + **Docker Compose** instalados no servidor/PC
   - Linux: `curl -fsSL https://get.docker.com | sh`
   - Windows/Mac: instale o **Docker Desktop** (https://docker.com)
2. **Git** para clonar o repositório

### Passo 1 — Clonar o repositório

```bash
git clone https://github.com/AtamisFilho/Mapa-Mental-Complexo-com-IA.git
cd Mapa-Mental-Complexo-com-IA
```

### Passo 2 — Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` e ajuste a senha do PostgreSQL (mude `mindmap_dev` para uma senha forte):

```bash
POSTGRES_PASSWORD="uma-senha-forte-aqui"
DATABASE_URL="postgresql://mindmap:uma-senha-forte-aqui@localhost:5432/mindmap?schema=public"
NEXT_PUBLIC_COLLAB_URL="http://localhost:3003"
```

### Passo 3 — Subir tudo (PostgreSQL + Web + Colaboração)

```bash
docker compose up -d --build
```

⏱️ Primeira vez: ~5 minutos (baixa imagens + build). Próximas vezes: ~30 segundos.

### Passo 4 — Acessar o app

- **App**: http://localhost:3000
- **Colaboração** (interno, não precisa acessar): porta 3003
- **PostgreSQL**: porta 5432 (para conectar ferramentas como DBeaver)

### Passo 5 — Compartilhar PostgreSQL com OUTROS projetos

O PostgreSQL criado pelo Docker Compose pode ser usado por seus outros projetos. **Duas formas**:

#### Forma A — Adicionar bancos no script de init

Edite `docker/postgres-init/01-create-databases.sh` e adicione:

```bash
createdb_if_not_exists "outro_projeto_db"
createdb_if_not_exists "analytics_db"
```

Depois: `docker compose down && docker compose up -d`

#### Forma B — Conectar outros containers Docker à mesma rede

No `docker-compose.yml` do **outro projeto**, adicione:

```yaml
services:
  outro-app:
    # ...
    networks:
      - mindmap-network  # rede compartilhada

networks:
  mindmap-network:
    external: true
    name: mindmap-network
```

E configure a `DATABASE_URL` do outro projeto assim:

```
postgresql://mindmap:senha@postgres:5432/outro_projeto_db?schema=public
```

(host = `postgres` porque é o nome do serviço na rede Docker)

### Comandos úteis (Docker Compose)

```bash
# Ver logs do app
docker compose logs -f web

# Reiniciar só o web
docker compose restart web

# Parar tudo (não apaga dados)
docker compose down

# Parar e APAGAR o banco (⚠️ perde todos os mapas)
docker compose down -v

# Atualizar app após git pull
git pull && docker compose up -d --build
```

---

## 🅱️ Railway (nugem simples)

> Use esta opção se não quiser mexer com servidor. Mas para o seu caso (vários projetos + PostgreSQL compartilhado), a opção 🅰️ é melhor.

### Por que Railway e não Vercel?

O app usa **PostgreSQL** (banco de dados) e tem um **serviço de colaboração em tempo real** (WebSocket). A Vercel não suporta WebSocket em apps serverless. O Railway suporta ambos.

### Passo a passo resumido

1. Acesse **https://railway.app** → "Login with GitHub"
2. "New Project" → "Deploy from GitHub repo" → escolha `Mapa-Mental-Complexo-com-IA`
3. Crie **2 serviços**:
   - **`web`** (raiz do repo): variável `DATABASE_URL` = string de conexão do Postgres
   - **`collab`** (subpasta `mini-services/collab-service`): porta 3003
4. Adicione um **PostgreSQL** ("+ New" → "Database" → "PostgreSQL")
5. No serviço `web`, adicione a variável `NEXT_PUBLIC_COLLAB_URL` com a URL pública do `collab`
6. Gere domínios públicos para os dois serviços
7. 🎉 Acesse a URL pública do `web`

### Detalhes completos

Veja o histórico deste ficheiro no commit `6d2110f` para a versão detalhada com prints.

---

## 🅲️ Teste Offline no PC e Android (PWA)

O app é uma **PWA** (Progressive Web App) — pode ser instalado no PC e no Android como um app nativo, e funciona offline.

### No PC (Chrome/Edge)

1. Suba o app localmente (opção 🅰️ ou `bun run dev`)
2. Abra **http://localhost:3000** no Chrome ou Edge
3. Procure o ícone **⊕ Instalar** na barra de endereço (canto direito)
   - Ou: menu ⋮ → "Instalar Mapa Mental IA..."
4. Clique em **Instalar**
5. O app abre como janela separada e fica no Menu Iniciar

### No Android

**Requisito**: o app precisa estar acessível pelo celular (mesma rede WiFi).

#### Opção 1 — Usar o IP do PC (teste local)

1. Descubra o IP do PC: no terminal, `ip addr | grep "inet "` (Linux) ou `ipconfig` (Windows)
   - Ex: `192.168.1.100`
2. Suba o app com Docker Compose (opção 🅰️)
3. No Android, abra **Chrome** e visite: `http://192.168.1.100:3000`
4. Menu ⋮ → **"Instalar aplicativo"**
5. O app aparece na gaveta de apps como um ícone nativo

#### Opção 2 — Via ngrok (acesso externo temporário)

Para testar o PWA num Android fora de casa:

```bash
# Instalar ngrok (uma vez)
npm install -g ngrok

# Expor o app local na internet
ngrok http 3000
```

O ngrok mostra uma URL tipo `https://abc123.ngrok.app`. Abra no Android e instale.

### Testar o modo offline

1. Abra o app instalado
2. Crie um mapa mental e adicione alguns nós
3. **Desligue a internet** (modo avião no Android, ou desligue WiFi no PC)
4. Recarregue a página — o mapa deve continuar acessível e editável
5. Os dados são salvos localmente e sincronizam quando a internet voltar (somente se houver PostgreSQL conectado; em modo `bun run dev` com SQLite, já estão salvos)

### Recursos PWA implementados

- ✅ **Manifest** (`/manifest.webmanifest`) — nome, ícones, cores, atalhos
- ✅ **Service Worker** (`/sw.js`) — cache offline de:
  - App shell (HTML/JS/CSS) — Stale-While-Revalidate
  - Imagens — Cache-First
  - API GET — Network-First com fallback offline
- ✅ **Ícones** em 5 tamanhos: 32, 192, 512 (standard + maskable), 180 (apple-touch)
- ✅ **Meta tags** para iOS, Android e Desktop
- ✅ **Atalhos** no menu do app: "Novo mapa" e "Gerar com IA"

---

## ✅ Checklist final (qualquer opção)

Antes de considerar pronto, verifique:

- [ ] A página inicial carregou com o editor de mapa mental
- [ ] Crie um mapa mental e adicione nós
- [ ] Recarregue a página — **os nós devem continuar lá** (banco persistente)
- [ ] Clique em "Partilhar mapa" e copie o link — abre em modo leitura
- [ ] **PWA**: instale o app e teste offline

---

## 💰 Comparação de custos

| Opção | Setup | Manutenção mensal | Recomendado para |
|-------|-------|-------------------|------------------|
| 🅰️ Docker Compose (VPS Hetzner/DigitalOcean) | 30 min | ~$4-6 | **Seu caso** (vários projetos) |
| 🅱️ Railway | 15 min | ~$5 | Iniciantes sem servidor |
| 🅲️ Teste local | 5 min | grátis | Validação antes de publicar |

---

## 🆘 Resolução de problemas

### Docker Compose

**"Port 5432 already in use"** — outro PostgreSQL já está rodando no PC. Solução: edite `docker-compose.yml` e mude `"5432:5432"` para `"5433:5432"`.

**"Cannot connect to PostgreSQL"** — aguarde 30s após `docker compose up` (o Postgres leva tempo para iniciar na primeira vez).

### PWA

**"O ícone de instalar não aparece"** — o SW só se ativa em produção. Se estiver rodando com `bun run dev`, o PWA não instala. Use `docker compose up` ou faça `bun run build && bun run start`.

**"App não funciona offline"** — na primeira visita, o browser precisa carregar todos os recursos online UMA vez. Depois funciona offline. Limpe o cache e tente de novo.

### Railway

**"A página ficou em branco"** — abra o Console do navegador (F12). Erro de **CORS** ou **WebSocket** = `NEXT_PUBLIC_COLLAB_URL` mal configurada.

---

## 🔄 Atualizações futuras

Sempre que quiser atualizar:

- **Docker Compose**: `git pull && docker compose up -d --build` (automático em ~1 min)
- **Railway**: faz `git push` e o Railway detecta e republica sozinho

---

## 📞 Precisa de ajuda?

Se travar em algum passo, me diga **exatamente em qual** e qual erro apareceu (print da tela ajuda muito).
