/**
 * Script para criar arquivo .env local para desenvolvimento
 * Execute: node create-env-local.js
 */

const fs = require('fs');
const path = require('path');

const envContent = `# ================================
# BANCO DE DADOS (LOCAL - XAMPP)
# ================================
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=artnaweb_monitor

# ================================
# SERVIDOR (LOCAL)
# ================================
PORT=3001
NODE_ENV=development

# ================================
# JWT
# ================================
JWT_SECRET=local-development-secret-key-change-in-production
JWT_EXPIRES_IN=8h

# ================================
# EMAIL (SMTP) - LOCAL
# ================================
SMTP_HOST=mail.artnaweb.com.br
SMTP_PORT=587
SMTP_USER=contato@artnaweb.com.br
SMTP_PASS=Slipk1402@
SMTP_FROM=contato@artnaweb.com.br
SMTP_FROM_NAME=ArtnaWEB Monitor

# ================================
# Sucuri API
# ================================
SUCURI_API_URL=https://sitecheck.sucuri.net/api/v3/
`;

const envPath = path.join(__dirname, '.env');

try {
  // Verificar se o arquivo já existe
  if (fs.existsSync(envPath)) {
    console.log('⚠️  Arquivo .env já existe!');
    console.log('   Se quiser recriar, delete o arquivo primeiro.');
    process.exit(0);
  }

  // Criar o arquivo
  fs.writeFileSync(envPath, envContent, 'utf8');
  
  console.log('✅ Arquivo .env criado com sucesso!');
  console.log('');
  console.log('📋 Configurações:');
  console.log('   - Banco de dados: artnaweb_monitor');
  console.log('   - Usuário: root');
  console.log('   - Senha: (vazia - padrão XAMPP)');
  console.log('   - Porta: 3001');
  console.log('   - Ambiente: development');
  console.log('');
  console.log('⚠️  IMPORTANTE:');
  console.log('   - Este arquivo NÃO será commitado no Git');
  console.log('   - As configurações de produção NÃO serão afetadas');
  console.log('');
  console.log('🚀 Próximos passos:');
  console.log('   1. Certifique-se de que o MySQL do XAMPP está rodando');
  console.log('   2. Crie o banco de dados: CREATE DATABASE artnaweb_monitor;');
  console.log('   3. Importe o schema: mysql -u root artnaweb_monitor < db.sql');
  console.log('   4. Crie o usuário admin: node scripts/create-admin.js');
  console.log('   5. Inicie o backend: npm run dev');
  
} catch (error) {
  console.error('❌ Erro ao criar arquivo .env:', error.message);
  process.exit(1);
}

