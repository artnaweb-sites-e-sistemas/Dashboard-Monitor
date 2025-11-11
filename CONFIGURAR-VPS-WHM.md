# 🚀 Configurar ArtnaWEB Monitor em VPS com WHM

## 📋 Pré-requisitos

- ✅ VPS com WHM (Web Host Manager) instalado
- ✅ Acesso root ou sudo ao servidor
- ✅ Domínio configurado: `gestao.artnaweb.com.br`
- ✅ Acesso SSH ao servidor

## 🎯 Estrutura Final

```
VPS com WHM
├── Backend (Node.js): api.gestao.artnaweb.com.br
├── Frontend (React): gestao.artnaweb.com.br
└── Banco MySQL: No mesmo servidor
```

## 📝 Passo 1: Criar Conta cPanel no WHM

1. Acesse o **WHM** (geralmente: `https://seu-servidor:2087`)
2. Faça login com credenciais root
3. Vá em **Account Functions** → **Create a New Account**
4. Preencha:
   - **Domain**: `gestao.artnaweb.com.br`
   - **Username**: `artnaw49` (ou outro)
   - **Password**: (senha segura)
   - **Email**: (seu email)
5. Clique em **Create**
6. **Anote as credenciais** (você precisará delas)

## 📝 Passo 2: Instalar Node.js no Servidor

### Opção A: Via WHM (Recomendado)

1. No **WHM**, procure por **"Node.js Selector"** ou **"Setup Node.js App"**
2. Se encontrar, você pode criar aplicações Node.js diretamente pelo WHM
3. Pule para o **Passo 3**

### Opção B: Instalar Manualmente via SSH

1. Conecte-se ao servidor via SSH:
   ```bash
   ssh root@seu-servidor
   ```

2. Instale Node.js usando NVM (Node Version Manager):
   ```bash
   # Instalar NVM
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   
   # Recarregar perfil
   source ~/.bashrc
   
   # Instalar Node.js 18.x
   nvm install 18
   nvm use 18
   nvm alias default 18
   
   # Verificar instalação
   node --version
   npm --version
   ```

3. Instale PM2 (gerenciador de processos Node.js):
   ```bash
   npm install -g pm2
   ```

## 📝 Passo 3: Configurar Banco de Dados MySQL

1. Acesse o **cPanel** da conta criada (ex: `https://gestao.artnaweb.com.br:2083`)
2. Vá em **MySQL Databases**
3. Crie um novo banco:
   - **Database Name**: `artnaw49_monitor` (ou outro)
   - Clique em **Create Database**
4. Crie um usuário MySQL:
   - **Username**: `artnaw49_monitor` (ou outro)
   - **Password**: (senha segura)
   - Clique em **Create User**
5. Associe o usuário ao banco:
   - Selecione usuário e banco
   - Clique em **Add**
   - Marque **ALL PRIVILEGES**
   - Clique em **Make Changes**
6. **Anote as credenciais:**
   - Host: `localhost`
   - Database: `artnaw49_monitor`
   - User: `artnaw49_monitor`
   - Password: (a senha que você criou)

7. Importe o banco:
   - Acesse **phpMyAdmin** no cPanel
   - Selecione o banco criado
   - Vá em **Importar**
   - Faça upload do arquivo `db.sql` (baixe do GitHub)

## 📝 Passo 4: Configurar Backend (Node.js)

### 4.1. Criar Diretório do Backend

Via SSH ou File Manager do cPanel:

```bash
# Via SSH
cd /home/artnaw49/
mkdir -p gestao.artnaweb.com.br/backend
cd gestao.artnaweb.com.br/backend
```

### 4.2. Fazer Upload dos Arquivos do Backend

**Opção A: Via Git (Recomendado)**

```bash
cd /home/artnaw49/gestao.artnaweb.com.br/backend
git clone https://github.com/artnaweb-sites-e-sistemas/Dashboard-Monitor.git .
# Ou clone apenas o backend
git clone https://github.com/artnaweb-sites-e-sistemas/Dashboard-Monitor.git temp
mv temp/backend/* .
mv temp/backend/.* . 2>/dev/null || true
rm -rf temp
```

**Opção B: Via FTP/SFTP**

- Conecte via FTP/SFTP
- Faça upload da pasta `backend/` para `/home/artnaw49/gestao.artnaweb.com.br/backend/`

### 4.3. Instalar Dependências

```bash
cd /home/artnaw49/gestao.artnaweb.com.br/backend
npm install --production
```

### 4.4. Criar Arquivo .env

```bash
cd /home/artnaw49/gestao.artnaweb.com.br/backend
nano .env
```

Cole o seguinte conteúdo (ajuste com suas credenciais):

```env
# Banco de Dados
DB_HOST=localhost
DB_USER=artnaw49_monitor
DB_PASS=sua_senha_mysql_aqui
DB_NAME=artnaw49_monitor

# Servidor
PORT=3001
NODE_ENV=production

# JWT
JWT_SECRET=GERE_UMA_CHAVE_ALEATORIA_SEGURA_AQUI
JWT_EXPIRES_IN=8h

# Email
SMTP_HOST=mail.artnaweb.com.br
SMTP_PORT=587
SMTP_USER=contato@artnaweb.com.br
SMTP_PASS=Slipk1402@
SMTP_FROM=contato@artnaweb.com.br
SMTP_FROM_NAME=ArtnaWEB Monitor

# APIs
SUCURI_API_URL=https://sitecheck.sucuri.net/api/v3/
SUCURI_API_KEY=SUA_CHAVE_SUCURI_AQUI
UPTIMEROBOT_API_KEY=SUA_CHAVE_UPTIMEROBOT_AQUI
```

Salve o arquivo (Ctrl+X, Y, Enter)

### 4.5. Criar Usuário Admin

```bash
cd /home/artnaw49/gestao.artnaweb.com.br/backend
node scripts/create-admin.js
```

### 4.6. Iniciar Backend com PM2

```bash
cd /home/artnaw49/gestao.artnaweb.com.br/backend
pm2 start server.js --name "artnaweb-monitor-backend"
pm2 save
pm2 startup
```

Isso fará o backend iniciar automaticamente após reinicializações.

## 📝 Passo 5: Configurar Proxy Reverso (Nginx/Apache)

O backend está rodando na porta 3001. Precisamos criar um proxy reverso para acessar via `api.gestao.artnaweb.com.br`.

### Opção A: Via WHM (Apache)

1. No **WHM**, vá em **Apache Configuration** → **Include Editor**
2. Selecione **All Versions**
3. Selecione **Pre VirtualHost Include**
4. Adicione o seguinte código:

```apache
# Proxy para API Node.js
<VirtualHost *:80>
    ServerName api.gestao.artnaweb.com.br
    ProxyPreserveHost On
    ProxyRequests Off
    ProxyPass / http://localhost:3001/
    ProxyPassReverse / http://localhost:3001/
</VirtualHost>

<VirtualHost *:443>
    ServerName api.gestao.artnaweb.com.br
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/api.gestao.artnaweb.com.br.crt
    SSLCertificateKeyFile /etc/ssl/private/api.gestao.artnaweb.com.br.key
    ProxyPreserveHost On
    ProxyRequests Off
    ProxyPass / http://localhost:3001/
    ProxyPassReverse / http://localhost:3001/
</VirtualHost>
```

5. Salve e reinicie Apache:
   ```bash
   /etc/init.d/httpd restart
   # ou
   systemctl restart httpd
   ```

### Opção B: Via cPanel (Apache)

1. No **cPanel**, vá em **Subdomains**
2. Crie subdomínio: `api.gestao.artnaweb.com.br`
3. No **File Manager**, edite `.htaccess` do subdomínio:

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://localhost:3001/$1 [P,L]
```

### Opção C: Via Nginx (Se usar Nginx)

1. Crie arquivo de configuração:
   ```bash
   nano /etc/nginx/conf.d/api-gestao.conf
   ```

2. Adicione:

```nginx
server {
    listen 80;
    server_name api.gestao.artnaweb.com.br;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

3. Teste e reinicie Nginx:
   ```bash
   nginx -t
   systemctl restart nginx
   ```

## 📝 Passo 6: Configurar SSL (HTTPS)

### Via WHM (AutoSSL)

1. No **WHM**, vá em **SSL/TLS** → **Manage AutoSSL**
2. Selecione o domínio `api.gestao.artnaweb.com.br`
3. Clique em **Run AutoSSL**
4. Aguarde alguns minutos

### Via Let's Encrypt (Manual)

```bash
# Instalar Certbot
yum install certbot python3-certbot-nginx  # Para CentOS/RHEL
# ou
apt-get install certbot python3-certbot-nginx  # Para Ubuntu/Debian

# Gerar certificado
certbot --nginx -d api.gestao.artnaweb.com.br
```

## 📝 Passo 7: Configurar Frontend

### 7.1. Fazer Build do Frontend

**Localmente** (no seu computador):

```bash
cd frontend
npm install
npm run build
```

### 7.2. Configurar URL da API

Antes do build, crie `frontend/.env.production`:

```env
VITE_API_URL=https://api.gestao.artnaweb.com.br/api
```

Depois faça o build novamente.

### 7.3. Fazer Upload do Frontend

**Via FTP/SFTP:**
- Conecte no servidor
- Faça upload de `frontend/dist/*` para `/home/artnaw49/gestao.artnaweb.com.br/public_html/`

**Via SSH:**

```bash
# No seu computador (local)
scp -r frontend/dist/* root@seu-servidor:/home/artnaw49/gestao.artnaweb.com.br/public_html/
```

### 7.4. Criar .htaccess para Frontend

No **File Manager** do cPanel, crie `.htaccess` em `public_html/`:

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

## 📝 Passo 8: Configurar Deploy Automático

### 8.1. Atualizar GitHub Actions

O workflow já está configurado, mas precisamos ajustar para VPS:

1. Atualize os secrets no GitHub:
   - `CPANEL_FTP_HOST`: IP ou domínio do seu servidor
   - `CPANEL_FTP_USER`: usuário FTP do cPanel
   - `CPANEL_FTP_PASS`: senha FTP

2. O deploy automático funcionará:
   - Backend será enviado via FTP
   - Frontend será buildado e enviado via FTP

### 8.2. Script de Deploy no Servidor (Opcional)

Crie um script para atualizar automaticamente:

```bash
nano /home/artnaw49/gestao.artnaweb.com.br/deploy.sh
```

```bash
#!/bin/bash
cd /home/artnaw49/gestao.artnaweb.com.br/backend
git pull origin main
npm install --production
pm2 restart artnaweb-monitor-backend
```

```bash
chmod +x /home/artnaw49/gestao.artnaweb.com.br/deploy.sh
```

## 📝 Passo 9: Verificar Tudo

### 9.1. Verificar Backend

```bash
# Verificar se está rodando
pm2 status

# Ver logs
pm2 logs artnaweb-monitor-backend

# Testar API
curl http://localhost:3001/api/health
```

### 9.2. Verificar Frontend

- Acesse: `https://gestao.artnaweb.com.br`
- Deve carregar o dashboard
- Faça login e teste

### 9.3. Verificar Proxy

- Acesse: `https://api.gestao.artnaweb.com.br/api/health`
- Deve retornar JSON com status

## 🔄 Comandos Úteis

### Gerenciar Backend (PM2)

```bash
# Ver status
pm2 status

# Ver logs
pm2 logs artnaweb-monitor-backend

# Reiniciar
pm2 restart artnaweb-monitor-backend

# Parar
pm2 stop artnaweb-monitor-backend

# Iniciar
pm2 start artnaweb-monitor-backend

# Ver informações
pm2 info artnaweb-monitor-backend
```

### Atualizar Código

```bash
cd /home/artnaw49/gestao.artnaweb.com.br/backend
git pull origin main
npm install --production
pm2 restart artnaweb-monitor-backend
```

## 🆘 Troubleshooting

### Backend não inicia

```bash
# Verificar logs
pm2 logs artnaweb-monitor-backend

# Verificar se porta está em uso
netstat -tulpn | grep 3001

# Verificar variáveis de ambiente
cat /home/artnaw49/gestao.artnaweb.com.br/backend/.env
```

### Proxy não funciona

```bash
# Verificar se Apache/Nginx está rodando
systemctl status httpd  # Apache
systemctl status nginx   # Nginx

# Verificar logs
tail -f /var/log/httpd/error_log  # Apache
tail -f /var/log/nginx/error.log  # Nginx
```

### Frontend não carrega

- Verificar se arquivos estão em `public_html/`
- Verificar se `.htaccess` existe
- Verificar permissões dos arquivos
- Verificar URL da API no `.env.production`

## ✅ Checklist Final

- [ ] Conta cPanel criada no WHM
- [ ] Node.js instalado no servidor
- [ ] PM2 instalado e configurado
- [ ] Banco MySQL criado e importado
- [ ] Backend configurado e rodando
- [ ] Arquivo `.env` criado com todas as variáveis
- [ ] Proxy reverso configurado (Apache/Nginx)
- [ ] SSL configurado para `api.gestao.artnaweb.com.br`
- [ ] Frontend buildado e enviado para `public_html/`
- [ ] `.htaccess` criado no frontend
- [ ] Usuário admin criado
- [ ] Deploy automático configurado (GitHub Actions)
- [ ] Tudo testado e funcionando

## 🎉 Pronto!

Agora você tem:
- ✅ Backend rodando em `https://api.gestao.artnaweb.com.br`
- ✅ Frontend rodando em `https://gestao.artnaweb.com.br`
- ✅ Tudo no mesmo servidor VPS
- ✅ Deploy automático via GitHub

