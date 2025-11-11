# Verificar Banco de Dados e Criar Usuário Admin em Produção

## Passo 1: Conectar via SSH ao servidor

```bash
ssh root@seu-servidor
```

## Passo 2: Navegar para o diretório do backend

```bash
cd /home/artnaw49/gestao.artnaweb.com.br/backend
```

## Passo 3: Verificar se o arquivo .env existe e está correto

```bash
cat .env
```

**Verifique se contém:**
```
DB_HOST=localhost
DB_USER=seu_usuario_mysql
DB_PASSWORD=sua_senha_mysql
DB_NAME=artnaweb_monitor
```

## Passo 4: Testar conexão com o banco de dados

```bash
# Carregar NVM (se necessário)
source ~/.nvm/nvm.sh
nvm use 16

# Testar conexão
node -e "
require('dotenv').config();
const mysql = require('mysql2/promise');
(async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    console.log('✅ Conexão com banco de dados OK!');
    await connection.end();
  } catch (error) {
    console.error('❌ Erro de conexão:', error.message);
    process.exit(1);
  }
})();
"
```

## Passo 5: Verificar se o banco de dados existe

```bash
mysql -u seu_usuario_mysql -p -e "SHOW DATABASES;" | grep artnaweb_monitor
```

Se não existir, você precisa criar:
```bash
mysql -u seu_usuario_mysql -p -e "CREATE DATABASE artnaweb_monitor CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

## Passo 6: Verificar se as tabelas existem

```bash
mysql -u seu_usuario_mysql -p artnaweb_monitor -e "SHOW TABLES;"
```

Se não existirem, você precisa importar o schema:
```bash
# Primeiro, baixe o arquivo db.sql do repositório ou copie do seu projeto local
mysql -u seu_usuario_mysql -p artnaweb_monitor < db.sql
```

## Passo 7: Criar/Atualizar usuário admin

```bash
# Carregar NVM (se necessário)
source ~/.nvm/nvm.sh
nvm use 16

# Executar script de criação de admin
node scripts/create-admin.js
```

**Credenciais padrão:**
- Usuário: `admin`
- Senha: `admin123`

## Passo 8: Verificar se o usuário foi criado

```bash
mysql -u seu_usuario_mysql -p artnaweb_monitor -e "SELECT id, username FROM users;"
```

## Passo 9: Verificar logs do backend

```bash
# Ver logs do PM2
pm2 logs artnaweb-monitor-backend

# Ou verificar status
pm2 status
```

## Passo 10: Testar login via API

```bash
curl -X POST https://api.gestao.artnaweb.com.br/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## Problemas Comuns

### Erro: "Access denied for user"
- Verifique se o usuário MySQL tem permissões no banco
- Execute: `GRANT ALL PRIVILEGES ON artnaweb_monitor.* TO 'seu_usuario'@'localhost';`

### Erro: "Database does not exist"
- Crie o banco: `CREATE DATABASE artnaweb_monitor;`

### Erro: "Table doesn't exist"
- Importe o schema: `mysql -u usuario -p artnaweb_monitor < db.sql`

### Erro: "Cannot find module 'dotenv'"
- Instale dependências: `npm install --production --legacy-peer-deps`

### Erro: "bcrypt" não funciona
- O código já foi modificado para usar `bcryptjs`, mas se ainda der erro:
  - `npm install bcryptjs --save --legacy-peer-deps`
  - Verifique se `scripts/create-admin.js` e `routes/auth.js` usam `bcryptjs`

