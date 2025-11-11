# 🚀 Configuração Inicial no cPanel - ArtnaWEB Monitor

## ⚠️ IMPORTANTE: Configurar Secrets no GitHub PRIMEIRO

Antes de começar, configure os secrets no GitHub:

1. Acesse: https://github.com/artnaweb-sites-e-sistemas/Dashboard-Monitor/settings/secrets/actions
2. Clique em **New repository secret** e adicione:

   **Secret 1:**
   - Nome: `CPANEL_FTP_HOST`
   - Valor: `ftp.artnaweb.com.br`

   **Secret 2:**
   - Nome: `CPANEL_FTP_USER`
   - Valor: `vipadminvip@gestao.artnaweb.com.br`

   **Secret 3:**
   - Nome: `CPANEL_FTP_PASS`
   - Valor: `zCtizKB3CGFB`

## 📋 Passo a Passo no cPanel

### 1. Criar Estrutura de Diretórios

1. Acesse **File Manager** no cPanel
2. Navegue até `/home/artnaw49/`
3. Crie a pasta `gestao.artnaweb.com.br` (se não existir)
4. Dentro dela, crie:
   - `backend/` (para a aplicação Node.js)
   - `public_html/` (para o frontend)

### 2. Configurar Banco de Dados MySQL

1. No cPanel, vá em **MySQL Databases**
2. Crie um novo banco (ex: `artnaw49_monitor`)
3. Crie um usuário MySQL e associe ao banco
4. **Anote as credenciais** (você precisará delas depois)
5. Acesse **phpMyAdmin**
6. Selecione o banco criado
7. Vá em **Importar**
8. Faça upload do arquivo `db.sql` (baixe do GitHub)

### 3. Configurar Aplicação Node.js (Backend)

1. No cPanel, procure por **"Node.js Selector"** ou **"Setup Node.js App"**
2. Clique em **Create Application**
3. Configure:
   - **Node.js Version**: `18.x` ou superior
   - **Application Mode**: `Production`
   - **Application Root**: `gestao.artnaweb.com.br/backend`
   - **Application URL**: 
     - Opção A: Criar subdomínio `api.gestao.artnaweb.com.br`
     - Opção B: Usar caminho `gestao.artnaweb.com.br/api`
   - **Application Startup File**: `server.js`
   - **Passenger Base URI**: (deixe vazio se usar subdomínio, ou `/api` se usar caminho)

4. Clique em **Create**

5. **Configure Variáveis de Ambiente** (muito importante!):
   Na aplicação Node.js criada, adicione estas variáveis:

   ```
   DB_HOST=localhost
   DB_USER=artnaw49_usuario (substitua pelo seu usuário MySQL)
   DB_PASS=sua_senha_mysql (substitua pela senha do MySQL)
   DB_NAME=artnaw49_monitor (substitua pelo nome do banco)
   PORT= (deixe vazio, o cPanel define)
   NODE_ENV=production
   JWT_SECRET=GERE_UMA_CHAVE_ALEATORIA_SEGURA_AQUI
   JWT_EXPIRES_IN=8h
   SMTP_HOST=mail.artnaweb.com.br
   SMTP_PORT=587
   SMTP_USER=contato@artnaweb.com.br
   SMTP_PASS=Slipk1402@
   SMTP_FROM=contato@artnaweb.com.br
   SMTP_FROM_NAME=ArtnaWEB Monitor
   SUCURI_API_URL=https://sitecheck.sucuri.net/api/v3/
   SUCURI_API_KEY=SUA_CHAVE_SUCURI_AQUI
   UPTIMEROBOT_API_KEY=SUA_CHAVE_UPTIMEROBOT_AQUI
   ```

6. Clique em **Save** e depois **Restart**

### 4. Verificar Subdomínio

1. No cPanel, vá em **Subdomains**
2. Verifique se `gestao.artnaweb.com.br` está configurado
3. O diretório deve apontar para: `/home/artnaw49/gestao.artnaweb.com.br/public_html`

### 5. Criar Arquivo .htaccess para Frontend

No **File Manager**, crie o arquivo `.htaccess` em `public_html/`:

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

## 🔄 Primeiro Deploy

### Opção A: Deploy Automático (Recomendado)

1. **Certifique-se de que os secrets estão configurados no GitHub** (Passo acima)
2. Faça um pequeno commit e push:
   ```bash
   git add .
   git commit -m "Configuração inicial"
   git push origin main
   ```
3. Acesse: https://github.com/artnaweb-sites-e-sistemas/Dashboard-Monitor/actions
4. Aguarde o workflow completar (pode levar 5-10 minutos)
5. Verifique se os arquivos foram enviados via FTP

### Opção B: Deploy Manual (Primeira vez)

Se preferir fazer manualmente na primeira vez:

1. **Localmente**, faça build do frontend:
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Via FTP**, faça upload:
   - Conecte no FTP: `ftp.artnaweb.com.br`
   - Usuário: `vipadminvip@gestao.artnaweb.com.br`
   - Senha: `zCtizKB3CGFB`
   - Backend: `backend/` → `/home/artnaw49/gestao.artnaweb.com.br/backend/`
   - Frontend: `frontend/dist/*` → `/home/artnaw49/gestao.artnaweb.com.br/public_html/`

3. **No cPanel Terminal/SSH**, instale dependências do backend:
   ```bash
   cd ~/gestao.artnaweb.com.br/backend
   npm install --production
   ```

4. **Reinicie a aplicação Node.js** no cPanel

## ✅ Pós-Deploy

### 1. Criar Usuário Admin

No cPanel, acesse **Terminal** ou **SSH** e execute:

```bash
cd ~/gestao.artnaweb.com.br/backend
node scripts/create-admin.js
```

### 2. Verificar URLs

- **Frontend**: https://gestao.artnaweb.com.br
- **Backend API**: https://api.gestao.artnaweb.com.br/api/health (ou a URL que você configurou)

### 3. Atualizar URL da API no Frontend

Se a URL do backend for diferente, você precisa:

1. Criar arquivo `frontend/.env.production` localmente:
   ```env
   VITE_API_URL=https://api.gestao.artnaweb.com.br/api
   ```
   (Ajuste conforme a URL real do backend)

2. Fazer commit e push:
   ```bash
   git add frontend/.env.production
   git commit -m "Atualizar URL da API para produção"
   git push origin main
   ```

## 🔄 Deploy Automático (Futuro

Agora, sempre que você fizer `git push origin main`:

1. ✅ O GitHub Actions fará o build do frontend automaticamente
2. ✅ Fazerá upload do backend via FTP
3. ✅ Fazerá upload do frontend buildado via FTP
4. ⚠️ **Você ainda precisa reiniciar a aplicação Node.js no cPanel** (ou podemos automatizar isso também)

## 📝 Estrutura Final

```
/home/artnaw49/gestao.artnaweb.com.br/
├── backend/                    # Aplicação Node.js
│   ├── server.js
│   ├── package.json
│   └── ...
├── public_html/                # Frontend (React build)
│   ├── index.html
│   ├── assets/
│   └── .htaccess
└── (arquivos do projeto)
```

## ❓ Dúvidas Frequentes

**Q: Onde configuro a aplicação Node.js?**
A: No cPanel, procure por "Node.js Selector" ou "Setup Node.js App"

**Q: Como sei qual URL usar para o backend?**
A: Depois de criar a aplicação Node.js, o cPanel mostrará a URL. Use essa URL no `.env.production`

**Q: Preciso instalar dependências manualmente?**
A: Na primeira vez, sim. Depois, o GitHub Actions fará tudo automaticamente, mas você ainda precisa executar `npm install --production` no backend via SSH após cada deploy.

**Q: Como reinicio a aplicação Node.js?**
A: No cPanel, na aplicação Node.js criada, há um botão "Restart"

## 🆘 Problemas?

- **Erro 500**: Verifique os logs da aplicação Node.js no cPanel
- **Frontend não carrega**: Verifique se o `.htaccess` está em `public_html/`
- **API não funciona**: Verifique se a aplicação Node.js está rodando e se as variáveis de ambiente estão corretas

