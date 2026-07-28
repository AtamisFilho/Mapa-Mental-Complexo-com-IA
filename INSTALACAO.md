# 💻 Instalar no seu Notebook — Guia Passo-a-Passo

Este guia te ajuda a rodar o **Mapa Mental Complexo com IA** no seu notebook para testar offline antes de publicar.

> 👶 **Não precisa saber programar.** Siga os passos em ordem.

---

## 📋 Qual método escolher?

| Método | Quando usar | Dificuldade |
|--------|-------------|-------------|
| **🅰️ Docker Desktop** (RECOMENDADO) | Quer tudo funcionando com 1 comando | ⭐⭐ |
| **🅱️ Bun + SQLite** (mais leve) | Notebook antigo/fraco, sem Docker | ⭐ |

> **Recomendo o método 🅰️** porque é o mesmo que você vai usar no servidor de produção. Assim você já testa a configuração real.

---

## 🅰️ Método Docker Desktop (RECOMENDADO)

### Passo 1 — Instalar Docker Desktop (5 min)

#### Windows 10/11
1. Baixe em: **https://www.docker.com/products/docker-desktop/**
2. Clique em **"Download for Windows"**
3. Execute o instalador `Docker Desktop Installer.exe`
4. **⚠️ IMPORTANTE**: Durante a instalação, marque a opção **"Use WSL 2 instead of Hyper-V"** (recomendado)
5. Após instalar, **reinicie o PC**
6. Abra o **Docker Desktop** (Menu Iniciar → Docker Desktop)
7. Aguarde até aparecer **"Engine running"** no canto inferior esquerdo

#### macOS (Intel ou Apple Silicon)
1. Baixe em: **https://www.docker.com/products/docker-desktop/**
2. Clique em **"Download for Mac"** (escolha Apple Silicon se for M1/M2/M3, ou Intel se for mais antigo)
3. Abra o `Docker.dmg` e arraste o Docker para a pasta Applications
4. Abra o Docker da pasta Applications
5. Aguarde até aparecer **"Engine running"**

#### Linux (Ubuntu/Debian)
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# faça logout e login de novo para o grupo fazer efeito
```

### Passo 2 — Instalar Git (2 min)

**Windows**: Baixe e instale de https://git-scm.com/download/win (deixe todas as opções padrão)

**Mac**: Já vem instalado por padrão. Se não tiver:
```bash
# Instalar Xcode Command Line Tools
xcode-select --install
```

**Linux**: `sudo apt install git` (Ubuntu/Debian)

### Passo 3 — Clonar o repositório (2 min)

Abra o **Terminal** (Windows: PowerShell ou Git Bash | Mac/Linux: Terminal):

```bash
# Escolha uma pasta (ex: Documentos)
cd ~/Documentos

# Clonar o repositório
git clone https://github.com/AtamisFilho/Mapa-Mental-Complexo-com-IA.git

# Entrar na pasta
cd Mapa-Mental-Complexo-com-IA
```

### Passo 4 — Configurar variáveis de ambiente (1 min)

```bash
# Criar ficheiro .env a partir do exemplo
cp .env.example .env
```

**Edite o `.env`** com o Bloco de Notas (Windows) ou `nano` (Mac/Linux):

```bash
# Mude a senha para algo seguro (anote!)
POSTGRES_PASSWORD="minha-senha-segura-123"

# Atualize a DATABASE_URL com a mesma senha
DATABASE_URL="postgresql://mindmap:minha-senha-segura-123@postgres:5432/mindmap?schema=public"

# URL do serviço de colaboração (deixe assim para teste local)
NEXT_PUBLIC_COLLAB_URL="http://localhost:3003"
```

Salve e feche.

### Passo 5 — Subir tudo com Docker Compose (5-10 min)

```bash
# No terminal, dentro da pasta do projeto:
docker compose up -d --build
```

⏱️ **Primeira vez**: 5-10 minutos (baixa imagens Docker + instala dependências + compila o app)

**Próximas vezes**: ~30 segundos

Você verá mensagens como:
```
✔ Container mindmap-postgres  Started
✔ Container mindmap-collab    Started
✔ Container mindmap-web       Started
```

### Passo 6 — Acessar o app 🎉

Abra o navegador em: **http://localhost:3000**

Pronto! O app está rodando no seu notebook.

### Passo 7 — Testar offline (PWA)

1. Abra **http://localhost:3000** no Chrome ou Edge
2. Procure o ícone **⊕ Instalar** na barra de endereço (canto direito)
3. Clique em **Instalar**
4. O app abre como janela separada
5. **Desligue a internet** e recarregue — continua funcionando! ✓

### Passo 8 — Instalar no Android (opcional)

1. Descubra o IP do seu notebook:
   - **Windows**: `ipconfig` no terminal → procure "IPv4" (ex: `192.168.1.100`)
   - **Mac/Linux**: `ip addr` ou `ifconfig` → procure `inet 192.168.x.x`
2. No Android (mesmo WiFi), abra o Chrome e visite:
   ```
   http://192.168.1.100:3000
   ```
   (substitua pelo IP do seu notebook)
3. Menu ⋮ → **"Instalar aplicativo"**
4. O app aparece na gaveta de apps como ícone nativo

---

### Comandos úteis (Docker)

```bash
# Ver o que está rodando
docker compose ps

# Ver logs do app (para debugar)
docker compose logs -f web

# Ver logs do banco
docker compose logs -f postgres

# Parar tudo (não apaga dados)
docker compose down

# Parar e APAGAR o banco (⚠️ perde todos os mapas)
docker compose down -v

# Reiniciar só o web (após editar código)
docker compose restart web

# Atualizar app após git pull
git pull && docker compose up -d --build
```

---

## 🅱️ Método Bun + SQLite (alternativa leve)

Use este método se:
- Seu notebook é antigo/fraco (menos de 8GB RAM)
- Não quer instalar Docker
- Quer apenas testar rapidamente

### Passo 1 — Instalar Bun (1 min)

**Windows** (PowerShell):
```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

**Mac/Linux**:
```bash
curl -fsSL https://bun.sh/install | bash
```

Feche e abra o terminal de novo. Teste:
```bash
bun --version
```

### Passo 2 — Clonar e instalar (3 min)

```bash
cd ~/Documentos
git clone https://github.com/AtamisFilho/Mapa-Mental-Complexo-com-IA.git
cd Mapa-Mental-Complexo-com-IA

# Instalar dependências
bun install
```

### Passo 3 — Configurar para SQLite (1 min)

Crie o ficheiro `.env`:
```bash
cp .env.example .env
```

Edite o `.env` e mude a `DATABASE_URL` para SQLite:
```bash
# Usar SQLite em vez de PostgreSQL (sem Docker)
DATABASE_URL="file:./db/custom.db"

# Serviço de colaboração (deixe vazio para desativar)
NEXT_PUBLIC_COLLAB_URL=""
```

### Passo 4 — Criar o banco de dados (30 seg)

```bash
bun run db:push
```

### Passo 5 — Rodar o app (10 seg)

```bash
bun run dev
```

Acesse: **http://localhost:3000**

---

## 🆘 Resolução de problemas

### Docker

**"Docker Engine not running"**
- Abra o Docker Desktop e aguarde até "Engine running"

**"Port 3000 already in use"**
- Outro app está usando a porta 3000. Edite o `docker-compose.yml` e mude `"3000:3000"` para `"3001:3000"`. Acesse `http://localhost:3001`

**"Port 5432 already in use"**
- Outro PostgreSQL já está rodando. Mude `"5432:5432"` para `"5433:5432"` no `docker-compose.yml`

**"Cannot connect to PostgreSQL"**
- Aguarde 30s após `docker compose up` (Postgres demora a iniciar na primeira vez)

### Bun

**"bun: command not found"**
- Feche e abra o terminal de novo. Se não funcionar, reinstale.

**"Prisma generate failed"**
- Rode manualmente: `bunx prisma generate --schema=prisma/schema.sqlite.prisma`

### Geral

**"A página ficou em branco"**
- Abra o Console do navegador (F12 → Console)
- Se aparecer erro de conexão, verifique se o servidor está rodando (`docker compose ps` ou veja se o terminal mostra "Ready")

**"Não consigo instalar como app (PWA)"**
- O PWA só funciona em produção. Para testar com PWA:
  ```bash
  # Método Docker: já é produção
  # Método Bun: rode em modo produção:
  bun run build
  bun run start
  ```
  Depois acesse http://localhost:3000 e o ícone de instalar deve aparecer

---

## 📞 Precisa de ajuda?

Se travar em algum passo:
1. **Anote o número do passo** (ex: "travei no Passo 5 do método Docker")
2. **Copie a mensagem de erro** (print da tela ou texto do terminal)
3. Me mande! Vou te orientar de forma específica.

---

## ✅ Checklist final

Antes de considerar pronto:

- [ ] App abre em http://localhost:3000
- [ ] Consigo criar um mapa mental
- [ ] Consigo adicionar nós e conectar eles
- [ ] Recarreguei a página e os dados continuam lá
- [ ] Cliquei em "Partilhar mapa" e o link funciona
- [ ] Instalei como PWA (ícone ⊕ na barra de endereço)
- [ ] Testei offline (desliguei internet e recarreguei)

Se todos os itens estão ✅, está pronto para publicar!
