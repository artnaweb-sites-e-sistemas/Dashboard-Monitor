# Guia de Deploy Automático - GitHub para cPanel

Este guia explica como configurar o deploy automático do GitHub para o cPanel.

## Opção 1: Deploy via Webhook (Recomendado)

### Passo 1: Configurar o script de deploy no cPanel

1. Faça upload do arquivo `deploy.php` para um diretório acessível via web no seu cPanel
   - Exemplo: `public_html/deploy.php` ou `public_html/api/deploy.php`

2. Edite o arquivo `deploy.php` e configure:
   - `$WEBHOOK_SECRET`: Defina um valor secreto seguro (ex: gere uma string aleatória)
   - `$PROJECT_DIR`: Caminho completo do projeto no servidor (ex: `/home/usuario/artnaweb-monitor`)
   - `$LOG_FILE`: Caminho para o arquivo de log

3. Torne o arquivo executável (se necessário):
   ```bash
   chmod 755 deploy.php
   ```

### Passo 2: Configurar Webhook no GitHub

1. Acesse o repositório no GitHub: https://github.com/artnaweb-sites-e-sistemas/Dashboard-Monitor
2. Vá em **Settings** → **Webhooks** → **Add webhook**
3. Configure:
   - **Payload URL**: `https://seudominio.com/deploy.php?secret=SEU_SECRET_AQUI`
   - **Content type**: `application/json`
   - **Secret**: (deixe vazio ou use o mesmo secret do PHP)
   - **Events**: Selecione "Just the push event"
   - **Active**: Marque como ativo
4. Clique em **Add webhook**

### Passo 3: Configurar permissões no cPanel

1. No cPanel, certifique-se de que o usuário tem permissão para executar `git pull` e `npm`
2. Configure as variáveis de ambiente da aplicação Node.js no cPanel

## Opção 2: Deploy via GitHub Actions (Alternativa)

### Passo 1: Configurar Secrets no GitHub

1. Acesse o repositório no GitHub
2. Vá em **Settings** → **Secrets and variables** → **Actions**
3. Adicione os seguintes secrets:
   - `CPANEL_FTP_HOST`: Host FTP do cPanel (ex: `ftp.seudominio.com`)
   - `CPANEL_FTP_USER`: Usuário FTP
   - `CPANEL_FTP_PASS`: Senha FTP
   - `CPANEL_SERVER_DIR`: Diretório no servidor (ex: `/home/usuario/artnaweb-monitor`)

### Passo 2: O GitHub Actions fará o deploy automaticamente

O arquivo `.github/workflows/deploy.yml` já está configurado e será executado automaticamente a cada push na branch `main`.

## Opção 3: Deploy Manual via SSH

Se você tem acesso SSH ao cPanel, pode executar o script `deploy.sh` manualmente:

```bash
chmod +x deploy.sh
./deploy.sh
```

Ou configure um cron job para executar periodicamente:

```bash
# Executar a cada hora
0 * * * * /home/usuario/artnaweb-monitor/deploy.sh
```

## Estrutura de Diretórios no cPanel

```
/home/usuario/
├── artnaweb-monitor/          # Projeto principal (clonado do GitHub)
│   ├── backend/               # Backend Node.js
│   │   ├── .env              # Criar manualmente com suas configurações
│   │   └── ...
│   ├── frontend/             # Frontend React
│   │   └── dist/             # Build do frontend (gerado automaticamente)
│   └── ...
├── public_html/               # Frontend build (copiar de frontend/dist/)
│   ├── index.html
│   └── assets/
└── ...
```

## Configuração Inicial no cPanel

### 1. Clonar o repositório

```bash
cd ~
git clone https://github.com/artnaweb-sites-e-sistemas/Dashboard-Monitor.git artnaweb-monitor
cd artnaweb-monitor
```

### 2. Configurar Backend

```bash
cd backend
cp env.example.txt .env
# Edite o .env com suas configurações
npm install --production
```

### 3. Configurar Frontend

```bash
cd ../frontend
npm install
npm run build
```

### 4. Copiar build do frontend para public_html

```bash
cp -r dist/* ~/public_html/
```

### 5. Configurar Aplicação Node.js no cPanel

1. No cPanel, vá em **Node.js Selector** ou **Setup Node.js App**
2. Crie uma nova aplicação:
   - **Node.js Version**: 18.x ou superior
   - **Application Root**: `artnaweb-monitor/backend`
   - **Application URL**: Escolha um subdomínio (ex: `api.seudominio.com`)
   - **Application Startup File**: `server.js`
3. Configure as variáveis de ambiente no cPanel
4. Clique em **Create** e depois **Restart**

## Atualizar URL da API no Frontend

Antes de fazer o build, atualize `frontend/src/services/api.js`:

```javascript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api.seudominio.com/api'
})
```

E crie `frontend/.env.production`:

```env
VITE_API_URL=https://api.seudominio.com/api
```

## Troubleshooting

### Erro: "Permission denied"
```bash
chmod +x deploy.sh
chmod 755 deploy.php
```

### Erro: "git pull failed"
Verifique se o diretório tem permissão de escrita:
```bash
chmod -R 755 artnaweb-monitor
```

### Erro: "npm command not found"
Certifique-se de que o Node.js está instalado e no PATH do cPanel.

### Logs de Deploy
Verifique o arquivo de log:
```bash
tail -f deploy.log
```

## Segurança

⚠️ **IMPORTANTE**: 
- Nunca commite arquivos `.env` com senhas
- Use secrets seguros nos webhooks
- Proteja o arquivo `deploy.php` com autenticação
- Considere usar HTTPS para o webhook

