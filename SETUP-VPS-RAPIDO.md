# ⚡ Setup Rápido - VPS com WHM

## 🎯 Resumo

Com VPS + WHM, você pode hospedar **tudo no mesmo servidor**:
- ✅ Backend Node.js (via PM2)
- ✅ Frontend React (via Apache/Nginx)
- ✅ Banco MySQL (no mesmo servidor)

## 📋 Checklist Rápido

### 1. Criar Conta cPanel no WHM
- WHM → Create a New Account
- Domain: `gestao.artnaweb.com.br`

### 2. Instalar Node.js
```bash
# Via SSH (como root)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
npm install -g pm2
```

### 3. Configurar Banco MySQL
- cPanel → MySQL Databases
- Criar banco e usuário
- Importar `db.sql` via phpMyAdmin

### 4. Configurar Backend
```bash
cd /home/artnaw49/gestao.artnaweb.com.br/backend
# Fazer upload dos arquivos (via Git ou FTP)
npm install --production
# Criar arquivo .env com credenciais
node scripts/create-admin.js
pm2 start server.js --name "artnaweb-monitor-backend"
pm2 save
```

### 5. Configurar Proxy Reverso
- Criar subdomínio `api.gestao.artnaweb.com.br`
- Configurar proxy para `localhost:3001`
- Ver guia completo: `CONFIGURAR-VPS-WHM.md`

### 6. Configurar Frontend
- Build local: `npm run build`
- Upload `dist/*` para `public_html/`
- Criar `.htaccess` em `public_html/`

### 7. Configurar SSL
- WHM → SSL/TLS → Manage AutoSSL
- Ou usar Let's Encrypt

## 🔄 Deploy Automático

O GitHub Actions já está configurado para fazer deploy via FTP.

**Opcional**: Para instalar dependências automaticamente após deploy, configure secrets SSH no GitHub:
- `CPANEL_SSH_HOST`
- `CPANEL_SSH_USER`
- `CPANEL_SSH_KEY`

## 📚 Guia Completo

Veja `CONFIGURAR-VPS-WHM.md` para instruções detalhadas passo a passo.

