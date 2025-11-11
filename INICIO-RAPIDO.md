# 🚀 Início Rápido - Deploy Automático cPanel

## ✅ O que já está configurado

- ✅ GitHub Actions workflow criado
- ✅ Scripts de deploy configurados
- ✅ Frontend configurado para produção

## 📝 O que você precisa fazer AGORA

### 1️⃣ Configurar Secrets no GitHub (OBRIGATÓRIO)

1. Acesse: https://github.com/artnaweb-sites-e-sistemas/Dashboard-Monitor/settings/secrets/actions
2. Clique em **"New repository secret"** e adicione:

   **Secret 1:**
   ```
   Nome: CPANEL_FTP_HOST
   Valor: ftp.artnaweb.com.br
   ```

   **Secret 2:**
   ```
   Nome: CPANEL_FTP_USER
   Valor: vipadminvip@gestao.artnaweb.com.br
   ```

   **Secret 3:**
   ```
   Nome: CPANEL_FTP_PASS
   Valor: zCtizKB3CGFB
   ```

### 2️⃣ Verificar se tem Node.js no cPanel

**IMPORTANTE**: Nem todos os cPanels têm suporte a Node.js!

1. Acesse seu cPanel
2. Procure por:
   - **"Node.js Selector"**
   - **"Setup Node.js App"**
   - **"Node.js"**
   - **"Application Manager"**

3. **Se encontrar**: Siga o guia **`CONFIGURAR-NODEJS-CPANEL.md`**

4. **Se NÃO encontrar**: Você tem 3 opções:
   - **Opção A**: Usar Railway/Render para backend (recomendado - grátis e fácil)
   - **Opção B**: Solicitar Node.js ao provedor
   - **Opção C**: Usar VPS separado

   **Veja detalhes em: `CONFIGURAR-NODEJS-CPANEL.md`**

### 3️⃣ Configurar no cPanel

Siga o guia completo em: **`SETUP-CPANEL.md`** ou **`CONFIGURAR-NODEJS-CPANEL.md`**

**Resumo rápido:**

1. **Criar estrutura de diretórios:**
   - `/home/artnaw49/gestao.artnaweb.com.br/backend/`
   - `/home/artnaw49/gestao.artnaweb.com.br/public_html/`

2. **Configurar banco MySQL:**
   - Criar banco `artnaw49_monitor`
   - Importar `db.sql` via phpMyAdmin

3. **Configurar aplicação Node.js:**
   - **Se tiver Node.js no cPanel**: Veja `CONFIGURAR-NODEJS-CPANEL.md`
   - **Se não tiver**: Use Railway/Render (veja `CONFIGURAR-NODEJS-CPANEL.md`)

4. **Criar arquivo `.htaccess`** em `public_html/`:
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

### 3️⃣ Primeiro Deploy

**Opção A: Automático (Recomendado)**

1. Certifique-se de que os secrets estão configurados (Passo 1)
2. Faça um commit e push:
   ```bash
   git add .
   git commit -m "Primeiro deploy"
   git push origin main
   ```
3. Acesse: https://github.com/artnaweb-sites-e-sistemas/Dashboard-Monitor/actions
4. Aguarde o workflow completar (5-10 minutos)
5. **IMPORTANTE**: Após o deploy, via SSH no cPanel, execute:
   ```bash
   cd ~/gestao.artnaweb.com.br/backend
   npm install --production
   ```
6. Reinicie a aplicação Node.js no cPanel

**Opção B: Manual (Primeira vez)**

Veja instruções em `SETUP-CPANEL.md`

### 4️⃣ Criar Usuário Admin

Após o primeiro deploy, via SSH no cPanel:

```bash
cd ~/gestao.artnaweb.com.br/backend
node scripts/create-admin.js
```

### 5️⃣ Atualizar URL da API (se necessário)

Se a URL do backend for diferente de `https://gestao.artnaweb.com.br/api`:

1. Crie `frontend/.env.production` localmente:
   ```env
   VITE_API_URL=https://api.gestao.artnaweb.com.br/api
   ```
   (Ajuste conforme a URL real configurada no cPanel)

2. Commit e push:
   ```bash
   git add frontend/.env.production
   git commit -m "Atualizar URL da API"
   git push origin main
   ```

## 🔄 Deploy Automático (Futuro)

Agora, **sempre que você fizer `git push origin main`**:

1. ✅ GitHub Actions faz build do frontend
2. ✅ Faz upload do backend via FTP
3. ✅ Faz upload do frontend via FTP
4. ✅ Cria/atualiza `.htaccess` automaticamente
5. ⚠️ **Você ainda precisa**:
   - Executar `npm install --production` no backend (via SSH)
   - Reiniciar a aplicação Node.js no cPanel

## 📚 Documentação Completa

- **`SETUP-CPANEL.md`** - Guia completo de configuração inicial
- **`DEPLOY-CPANEL.md`** - Detalhes do deploy automático
- **`DEPLOY.md`** - Guia geral de deploy

## ❓ Dúvidas?

1. **Onde configuro a aplicação Node.js?**
   → No cPanel, procure "Node.js Selector" ou "Setup Node.js App"

2. **Como sei qual URL usar?**
   → Após criar a aplicação Node.js, o cPanel mostrará a URL

3. **Preciso fazer algo manual após cada deploy?**
   → Sim, executar `npm install --production` e reiniciar a aplicação

4. **O deploy automático funciona?**
   → Sim, mas você precisa configurar os secrets primeiro!

## 🎯 Checklist

- [ ] Secrets configurados no GitHub
- [ ] Estrutura de diretórios criada no cPanel
- [ ] Banco MySQL criado e `db.sql` importado
- [ ] Aplicação Node.js configurada no cPanel
- [ ] Variáveis de ambiente configuradas
- [ ] Arquivo `.htaccess` criado em `public_html/`
- [ ] Primeiro deploy realizado
- [ ] Dependências instaladas no backend (via SSH)
- [ ] Aplicação Node.js reiniciada
- [ ] Usuário admin criado
- [ ] URLs testadas (frontend e backend)

## 🆘 Problemas Comuns

**Deploy não funciona:**
- Verifique se os secrets estão configurados
- Verifique os logs do GitHub Actions

**Aplicação não inicia:**
- Verifique variáveis de ambiente
- Verifique logs da aplicação Node.js no cPanel

**Frontend não carrega:**
- Verifique se `.htaccess` está em `public_html/`
- Verifique URL da API no `.env.production`

