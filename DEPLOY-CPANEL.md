# Guia de Deploy - ArtnaWEB Monitor no cPanel

## Informações do Servidor

- **Caminho do Projeto**: `/home/artnaw49/gestao.artnaweb.com.br`
- **Frontend URL**: `https://gestao.artnaweb.com.br`
- **Backend URL**: Será configurado como aplicação Node.js no cPanel
- **FTP Host**: `ftp.artnaweb.com.br`
- **FTP Port**: `21`

## Passo 1: Configurar Secrets no GitHub

1. Acesse: https://github.com/artnaweb-sites-e-sistemas/Dashboard-Monitor/settings/secrets/actions
2. Clique em **New repository secret**
3. Adicione os seguintes secrets:

   - **Nome**: `CPANEL_FTP_HOST`
     **Valor**: `ftp.artnaweb.com.br`

   - **Nome**: `CPANEL_FTP_USER`
     **Valor**: `vipadminvip@gestao.artnaweb.com.br`

   - **Nome**: `CPANEL_FTP_PASS`
     **Valor**: `zCtizKB3CGFB`

## Passo 2: Configuração Inicial no cPanel

### 2.1. Criar Estrutura de Diretórios

1. Acesse o **File Manager** no cPanel
2. Navegue até `/home/artnaw49/`
3. Crie a estrutura de diretórios:
   ```
   gestao.artnaweb.com.br/
   ├── backend/
   ├── public_html/
   └── .env (será criado depois)
   ```

### 2.2. Configurar Banco de Dados MySQL

1. No cPanel, vá em **MySQL Databases**
2. Crie um novo banco de dados (ex: `artnaw49_monitor`)
3. Crie um usuário MySQL e associe ao banco
4. Anote as credenciais:
   - **Host**: (geralmente `localhost`)
   - **Database**: `artnaw49_monitor`
   - **User**: `artnaw49_usuario`
   - **Password**: `sua_senha`

5. Importe o arquivo `db.sql` via **phpMyAdmin**:
   - Acesse phpMyAdmin no cPanel
   - Selecione o banco criado
   - Vá em **Importar**
   - Faça upload do arquivo `db.sql`

### 2.3. Configurar Aplicação Node.js (Backend)

1. No cPanel, vá em **Node.js Selector** ou **Setup Node.js App**
2. Clique em **Create Application**
3. Configure:
   - **Node.js Version**: `18.x` ou superior
   - **Application Mode**: `Production`
   - **Application Root**: `gestao.artnaweb.com.br/backend`
   - **Application URL**: Escolha um subdomínio ou caminho (ex: `api.gestao.artnaweb.com.br` ou `gestao.artnaweb.com.br/api`)
   - **Application Startup File**: `server.js`
   - **Passenger Base URI**: (deixe vazio ou `/api` se usar subdomínio)

4. Clique em **Create**

5. **Configure as Variáveis de Ambiente** na aplicação Node.js:
   - `DB_HOST`: `localhost` (ou o host do MySQL)
   - `DB_USER`: `artnaw49_usuario` (usuário do MySQL)
   - `DB_PASS`: `sua_senha` (senha do MySQL)
   - `DB_NAME`: `artnaw49_monitor` (nome do banco)
   - `PORT`: (deixe vazio, o cPanel define automaticamente)
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: (gere uma chave aleatória segura)
   - `JWT_EXPIRES_IN`: `8h`
   - `SMTP_HOST`: `mail.artnaweb.com.br`
   - `SMTP_PORT`: `587`
   - `SMTP_USER`: `contato@artnaweb.com.br`
   - `SMTP_PASS`: `Slipk1402@`
   - `SMTP_FROM`: `contato@artnaweb.com.br`
   - `SMTP_FROM_NAME`: `ArtnaWEB Monitor`
   - `SUCURI_API_URL`: `https://sitecheck.sucuri.net/api/v3/`
   - `SUCURI_API_KEY`: (sua chave da API Sucuri)
   - `UPTIMEROBOT_API_KEY`: (sua chave da API UptimeRobot)

6. Clique em **Save** e depois **Restart**

### 2.4. Configurar Frontend (Subdomínio)

1. No cPanel, vá em **Subdomains**
2. Verifique se `gestao.artnaweb.com.br` está configurado
3. O diretório do subdomínio deve ser: `/home/artnaw49/gestao.artnaweb.com.br/public_html`

### 2.5. Criar Arquivo .env.production no Frontend

Antes do primeiro deploy, crie o arquivo `frontend/.env.production` localmente:

```env
VITE_API_URL=https://api.gestao.artnaweb.com.br/api
```

Ou se o backend estiver em `gestao.artnaweb.com.br/api`:

```env
VITE_API_URL=https://gestao.artnaweb.com.br/api
```

**IMPORTANTE**: Ajuste a URL conforme a configuração do backend no cPanel.

## Passo 3: Primeiro Deploy Manual (Opcional)

Antes de configurar o deploy automático, você pode fazer um deploy manual:

1. **Localmente**, faça o build do frontend:
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Via FTP**, faça upload:
   - Backend: `backend/` → `/home/artnaw49/gestao.artnaweb.com.br/backend/`
   - Frontend: `frontend/dist/*` → `/home/artnaw49/gestao.artnaweb.com.br/public_html/`

3. **No cPanel**, instale as dependências do backend:
   - Acesse **Terminal** ou **SSH**
   - Execute:
     ```bash
     cd ~/gestao.artnaweb.com.br/backend
     npm install --production
     ```

4. **No cPanel**, reinicie a aplicação Node.js

## Passo 4: Configurar Deploy Automático

### 4.1. Configurar Secrets no GitHub

Já configurado no Passo 1.

### 4.2. Testar o Deploy

1. Faça uma pequena alteração no código
2. Faça commit e push:
   ```bash
   git add .
   git commit -m "Teste de deploy"
   git push origin main
   ```

3. Acesse: https://github.com/artnaweb-sites-e-sistemas/Dashboard-Monitor/actions
4. Verifique se o workflow está rodando
5. Aguarde a conclusão (pode levar alguns minutos)

### 4.3. Verificar Deploy

1. Acesse `https://gestao.artnaweb.com.br` (frontend)
2. Acesse `https://api.gestao.artnaweb.com.br/api/health` (backend - ajuste a URL)
3. Verifique os logs da aplicação Node.js no cPanel

## Passo 5: Criar Usuário Admin

Após o primeiro deploy, crie o usuário admin:

1. No cPanel, acesse **Terminal** ou **SSH**
2. Execute:
   ```bash
   cd ~/gestao.artnaweb.com.br/backend
   node scripts/create-admin.js
   ```

## Passo 6: Configurar .htaccess para Frontend

Crie um arquivo `.htaccess` em `public_html/`:

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

Isso garante que o React Router funcione corretamente.

## Estrutura Final no Servidor

```
/home/artnaw49/gestao.artnaweb.com.br/
├── backend/                    # Aplicação Node.js
│   ├── server.js
│   ├── package.json
│   ├── node_modules/          # Instalado via npm install
│   └── ...
├── public_html/                # Frontend (build)
│   ├── index.html
│   ├── assets/
│   └── .htaccess
└── .env                        # (não commitado, criar manualmente)
```

## Troubleshooting

### Erro: "Application failed to start"
- Verifique os logs da aplicação Node.js no cPanel
- Verifique se todas as variáveis de ambiente estão configuradas
- Verifique se o banco de dados está acessível

### Erro: "Cannot find module"
- Execute `npm install --production` no diretório do backend via SSH

### Frontend não carrega
- Verifique se o arquivo `.htaccess` está em `public_html/`
- Verifique se a URL da API está correta no `.env.production`

### Deploy automático não funciona
- Verifique os secrets no GitHub
- Verifique os logs do GitHub Actions
- Verifique as permissões FTP

## Atualizações Futuras

Agora, sempre que você fizer `git push origin main`, o deploy será automático:

1. O GitHub Actions fará o build do frontend
2. Fazerá upload do backend via FTP
3. Fazerá upload do frontend buildado via FTP
4. Você só precisa reiniciar a aplicação Node.js no cPanel (ou configurar isso também)

## Dicas

- **Logs**: Sempre verifique os logs da aplicação Node.js no cPanel após cada deploy
- **Backup**: Faça backup do banco de dados antes de grandes atualizações
- **Teste**: Teste em desenvolvimento antes de fazer push para produção

