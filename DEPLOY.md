# 🚀 Guia de Deploy — Mapa Mental Complexo com IA

Este guia explica como **publicar o seu site na internet** para que qualquer pessoa possa acessá-lo por um link (ex: `https://mapa-mental.up.railway.app`).

> 👶 **Escrito para iniciantes** — não precisa saber programar. Basta seguir os passos em ordem, clicando onde indicado.

---

## 📋 Antes de começar — o que você vai precisar

| O quê | Tempo estimado | Custo |
|-------|----------------|-------|
| Uma conta no **GitHub** (já tem, pois o código está lá) | — | grátis |
| Uma conta no **Railway** (vamos criar agora) | 2 min | free trial de $5 |
| Cartão de crédito **OU** PayPal (só para validar a conta — não será cobrado durante o trial) | — | — |

**⏱️ Tempo total do deploy: ~15 minutos**

---

## 🎯 Por que Railway e não Vercel?

O seu app usa **SQLite** (banco de dados em arquivo) e tem um **serviço de colaboração em tempo real** (WebSocket). A Vercel não suporta nenhum dos dois. O Railway suporta ambos nativamente, com configuração mínima.

---

## 🚦 Passo a passo

### Passo 1 — Criar conta no Railway (2 min)

1. Acesse **https://railway.app**
2. Clique no botão **"Login"** no canto superior direito
3. Clique em **"Login with GitHub"** (é a forma mais fácil — conecta direto ao seu repositório)
4. Autorize o Railway a acessar sua conta GitHub
5. Pronto! Você está dentro do dashboard

### Passo 2 — Criar o projeto a partir do GitHub (3 min)

1. No dashboard do Railway, clique em **"New Project"** (botão verde, no canto superior direito)
2. Selecione **"Deploy from GitHub repo"**
3. Se aparecer a lista de repositórios, procure por `Mapa-Mental-Complexo-com-IA`
   - Se não aparecer, clique em **"Configure GitHub App"** e dê permissão ao repositório
4. Clique no repositório `Mapa-Mental-Complexo-com-IA`
5. **⚠️ IMPORTANTE — NÃO clique em "Deploy Now" ainda!**
   - Você verá uma tela perguntando qual serviço criar
   - Clique em **"Add Service"** → deixe em branco por enquanto
   - Vamos configurar **dois serviços**: o app principal e o collab-service

### Passo 3 — Criar o Serviço 1 (App Principal Next.js) (3 min)

1. Na página do projeto, clique em **"+ New"** → **"GitHub Repo"**
2. Selecione `AtamisFilho/Mapa-Mental-Complexo-com-IA`
3. O Railway vai detectar o `Dockerfile` automaticamente e começar a build
4. **Renomeie o serviço**: clique no lápis ao lado do nome (algo como `railway-app-xxxx`) e mude para **`web`**
5. **Configurar variáveis de ambiente**:
   - Clique no serviço `web`
   - Vá na aba **"Variables"**
   - Clique em **"New Variable"** e adicione:
     ```
     Name:  DATABASE_URL
     Value: file:/app/data/mindmap.db
     ```
6. **Adicionar volume persistente** (para o SQLite não perder dados):
   - No serviço `web`, vá na aba **"Settings"**
   - Desça até **"Volumes"**
   - Clique em **"Add Volume"**
   - Configure:
     - **Mount path**: `/app/data`
     - **Name**: `data` (ou deixe automático)
   - Clique em **"Add"**

### Passo 4 — Criar o Serviço 2 (Colaboração em Tempo Real) (2 min)

1. De volta à página do projeto, clique em **"+ New"** → **"GitHub Repo"**
2. Selecione novamente `AtamisFilho/Mapa-Mental-Complexo-com-IA`
3. **Configurar o root directory** (porque este serviço está numa subpasta):
   - Clique no novo serviço
   - Vá na aba **"Settings"**
   - Procure por **"Root Directory"** e clique em **"Configure"**
   - Digite: `mini-services/collab-service`
   - Clique em **"Save"**
4. **Renomeie o serviço** para **`collab`**
5. O Railway detectará o `mini-services/collab-service/Dockerfile` automaticamente

### Passo 5 — Conectar os dois serviços (2 min)

1. No serviço `web`, vá na aba **"Variables"**
2. Clique em **"New Variable"** e adicione:
   ```
   Name:  NEXT_PUBLIC_COLLAB_URL
   Value: (cole aqui a URL do serviço collab — ver passo abaixo)
   ```
3. **Descobrir a URL do serviço collab**:
   - Clique no serviço `collab`
   - Vá na aba **"Settings"** → **"Networking"**
   - Clique em **"Generate Domain"**
   - Uma URL vai aparecer, tipo: `collab-production-xxxx.up.railway.app`
   - Copie essa URL completa (com `https://`)
4. **Cole essa URL** na variável `NEXT_PUBLIC_COLLAB_URL` do serviço `web`

### Passo 6 — Gerar a URL pública do app (1 min)

1. Clique no serviço `web`
2. Vá na aba **"Settings"** → **"Networking"**
3. Clique em **"Generate Domain"**
4. Uma URL vai aparecer, tipo: `web-production-xxxx.up.railway.app`
5. **🎉 Acesse essa URL no navegador — seu app está no ar!**

---

## ✅ Checklist final

Antes de considerar pronto, verifique:

- [ ] Acesse a URL do `web` — a página inicial carregou com o editor de mapa mental
- [ ] Crie um novo mapa mental e adicione alguns nós
- [ ] Recarregue a página — **os nós devem continuar lá** (confirma que o SQLite persistente está funcionando)
- [ ] Clique em "Partilhar mapa" e copie o link — abre em modo leitura
- [ ] (Opcional) Abra o link de share em outra aba/janela — confirma que está público

---

## 💰 Sobre custos

O Railway oferece **$5 de crédito grátis** ao criar a conta. Para um app pessoal com pouco tráfego, isso dura cerca de **1 mês**. Depois disso:

- **Uso leve** (você + alguns amigos): **~$5/mês**
- **Uso intenso** (muitos usuários simultâneos): pode chegar a $20/mês

Você pode definir **limites de gastos** no dashboard para nunca ser surpreendido.

---

## 🆘 Resolução de problemas comuns

### ❌ "A página ficou em branco"

- Abra o Console do navegador (F12 → aba "Console")
- Se aparecer erro de **CORS** ou **WebSocket connection failed**, é o `NEXT_PUBLIC_COLLAB_URL` mal configurado — verifique se começa com `https://` e não tem barra no final

### ❌ "Perdi todos os mapas quando recarreguei"

- O volume persistente não está configurado. Volte ao **Passo 3, item 6** e adicione o volume em `/app/data`

### ❌ "Erro de build"

- Clique no serviço `web` → aba **"Deployments"** → clique no deploy que falhou
- Leia o log. O erro mais comum é `prisma generate` falhando — mas o Dockerfile já cuida disso

### ❌ "Como ver os logs do app?"

- Clique no serviço → aba **"Deployments"** → clique no deploy atual → **"Logs"** ou **"Details"**

---

## 🔄 Atualizações futuras

Sempre que você quiser atualizar o app em produção:

1. Faça as alterações no código
2. Faça `git push` para o GitHub (ou merge um PR)
3. **O Railway detecta automaticamente** e republica em ~2 minutos

---

## 📞 Precisa de ajuda?

Se travar em algum passo, me diga **exatamente em qual** e qual erro apareceu (print da tela ajuda muito). Posso te orientar de forma mais específica.
