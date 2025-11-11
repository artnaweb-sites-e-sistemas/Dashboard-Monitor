# 🚀 Como Configurar Node.js no cPanel

## ⚠️ Verificação Inicial

Nem todos os cPanels têm suporte a Node.js. Vamos verificar:

### Opção 1: Verificar se Node.js está disponível

1. Acesse seu cPanel
2. Procure por uma das seguintes opções:
   - **"Node.js Selector"**
   - **"Setup Node.js App"**
   - **"Node.js"**
   - **"Application Manager"**

3. Se você encontrar alguma dessas opções, siga para a **"Configuração com Node.js Selector"** abaixo.

4. Se **NÃO encontrar**, você tem duas opções:
   - **Opção A**: Usar um servidor Node.js separado (VPS, servidor dedicado)
   - **Opção B**: Usar um serviço de hospedagem Node.js (Heroku, Railway, Render, etc.)
   - **Opção C**: Solicitar ao provedor de hospedagem que habilite Node.js

---

## 📋 Configuração com Node.js Selector (cPanel com Node.js)

### Passo 1: Criar Aplicação Node.js

1. No cPanel, vá em **"Node.js Selector"** ou **"Setup Node.js App"**
2. Clique em **"Create Application"** ou **"Create"**
3. Preencha os campos:

   **Versão do Node.js:**
   - Selecione `18.x` ou superior (recomendado: `18.17.0` ou `20.x`)

   **Application Mode:**
   - Selecione `Production`

   **Application Root:**
   - Digite: `gestao.artnaweb.com.br/backend`
   - Ou use o caminho completo: `/home/artnaw49/gestao.artnaweb.com.br/backend`

   **Application URL:**
   - Opção A: Criar subdomínio `api.gestao.artnaweb.com.br`
   - Opção B: Usar caminho `gestao.artnaweb.com.br/api`
   - **Recomendado**: Criar subdomínio `api.gestao.artnaweb.com.br`

   **Application Startup File:**
   - Digite: `server.js`

   **Passenger Base URI:**
   - Se usar subdomínio: deixe vazio
   - Se usar caminho: digite `/api`

4. Clique em **"Create"** ou **"Create Application"**

### Passo 2: Configurar Variáveis de Ambiente

Após criar a aplicação, você verá uma tela com as configurações. Procure por **"Environment Variables"** ou **"Variables"**:

1. Clique em **"Add Variable"** ou **"Edit Variables"**
2. Adicione cada variável uma por uma:

   ```
   DB_HOST = localhost
   DB_USER = artnaw49_usuario (substitua pelo seu usuário MySQL)
   DB_PASS = sua_senha_mysql (substitua pela senha do MySQL)
   DB_NAME = artnaw49_monitor (substitua pelo nome do banco)
   NODE_ENV = production
   JWT_SECRET = GERE_UMA_CHAVE_ALEATORIA_SEGURA_AQUI (ex: use um gerador online)
   JWT_EXPIRES_IN = 8h
   SMTP_HOST = mail.artnaweb.com.br
   SMTP_PORT = 587
   SMTP_USER = contato@artnaweb.com.br
   SMTP_PASS = Slipk1402@
   SMTP_FROM = contato@artnaweb.com.br
   SMTP_FROM_NAME = ArtnaWEB Monitor
   SUCURI_API_URL = https://sitecheck.sucuri.net/api/v3/
   SUCURI_API_KEY = SUA_CHAVE_SUCURI_AQUI
   UPTIMEROBOT_API_KEY = SUA_CHAVE_UPTIMEROBOT_AQUI
   ```

3. Clique em **"Save"** ou **"Update"**

### Passo 3: Instalar Dependências

1. No cPanel, acesse **"Terminal"** ou **"SSH Access"**
2. Execute os comandos:

   ```bash
   cd ~/gestao.artnaweb.com.br/backend
   npm install --production
   ```

3. Aguarde a instalação terminar

### Passo 4: Reiniciar Aplicação

1. Volte para a tela da aplicação Node.js no cPanel
2. Clique em **"Restart"** ou **"Restart App"**
3. Aguarde alguns segundos

### Passo 5: Verificar se está funcionando

1. Acesse a URL da aplicação no navegador:
   - Se usou subdomínio: `https://api.gestao.artnaweb.com.br/api/health`
   - Se usou caminho: `https://gestao.artnaweb.com.br/api/api/health`

2. Você deve ver uma resposta JSON ou uma mensagem de sucesso

---

## 🔄 Alternativa: Se Node.js NÃO estiver disponível no cPanel

Se seu cPanel **não tem suporte a Node.js**, você tem estas opções:

### Opção A: Servidor Node.js Separado (VPS)

1. Contrate um VPS (DigitalOcean, Linode, Vultr, etc.)
2. Instale Node.js no VPS
3. Configure o backend no VPS
4. Configure o frontend no cPanel (apenas HTML/JS estático)
5. Atualize a URL da API no frontend para apontar para o VPS

### Opção B: Serviço de Hospedagem Node.js (Recomendado para iniciantes)

Use serviços como:

- **Railway** (https://railway.app) - Grátis para começar
- **Render** (https://render.com) - Grátis para começar
- **Heroku** (https://heroku.com) - Pago
- **Fly.io** (https://fly.io) - Grátis para começar

**Vantagens:**
- Fácil de configurar
- Deploy automático via GitHub
- Grátis para começar
- Não precisa configurar servidor

**Como fazer:**

1. Crie conta em um desses serviços
2. Conecte seu repositório GitHub
3. Configure as variáveis de ambiente
4. O serviço fará o deploy automaticamente
5. Você receberá uma URL (ex: `https://seu-app.railway.app`)
6. Atualize `frontend/.env.production` com essa URL

### Opção C: Solicitar ao Provedor

1. Entre em contato com seu provedor de hospedagem
2. Solicite que habilitem Node.js no cPanel
3. Alguns provedores fazem isso gratuitamente, outros cobram

---

## 📝 Configuração do Frontend (Sempre no cPanel)

Independente de onde o backend estiver, o frontend sempre pode ficar no cPanel:

1. O frontend é apenas HTML/JS/CSS estático
2. Pode ser hospedado em qualquer servidor web (Apache/Nginx)
3. O cPanel suporta isso perfeitamente

**O que você precisa fazer:**

1. Fazer build do frontend localmente:
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. Fazer upload da pasta `frontend/dist/` para `public_html/` no cPanel

3. Criar arquivo `.htaccess` em `public_html/`:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

4. Atualizar `frontend/.env.production` com a URL do backend:
   ```env
   VITE_API_URL=https://api.gestao.artnaweb.com.br/api
   ```
   (Ou a URL do serviço de hospedagem Node.js que você escolher)

---

## 🎯 Recomendação

**Se você não tem Node.js no cPanel**, recomendo:

1. **Usar Railway ou Render** para o backend (grátis, fácil, deploy automático)
2. **Manter o frontend no cPanel** (já está configurado)

**Vantagens:**
- ✅ Não precisa configurar servidor
- ✅ Deploy automático via GitHub
- ✅ Grátis para começar
- ✅ Escalável

**Próximos passos se escolher Railway/Render:**

1. Criar conta no serviço escolhido
2. Conectar repositório GitHub
3. Configurar variáveis de ambiente
4. Fazer deploy
5. Atualizar URL da API no frontend
6. Fazer deploy do frontend no cPanel

---

## ❓ Dúvidas?

**P: Como sei se meu cPanel tem Node.js?**
R: Procure por "Node.js Selector" ou "Setup Node.js App" no cPanel. Se não encontrar, provavelmente não tem.

**P: Posso usar o backend em um serviço e frontend no cPanel?**
R: Sim! É uma configuração comum e recomendada.

**P: Qual serviço de hospedagem Node.js é melhor?**
R: Para começar, recomendo Railway ou Render. São gratuitos e fáceis de usar.

**P: Preciso mudar o código para usar um serviço externo?**
R: Não! O código funciona igual. Só precisa atualizar a URL da API no frontend.

---

## 📚 Próximos Passos

1. **Verifique se tem Node.js no cPanel** (procure "Node.js Selector")
2. **Se tiver**: Siga a seção "Configuração com Node.js Selector"
3. **Se não tiver**: Escolha uma alternativa (Railway/Render recomendado)
4. **Configure o frontend no cPanel** (sempre funciona)
5. **Teste tudo**

