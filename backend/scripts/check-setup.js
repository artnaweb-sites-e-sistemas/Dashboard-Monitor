/**
 * Script de diagnóstico do sistema
 * Verifica se tudo está configurado corretamente
 */

require('dotenv').config();
const db = require('../config/database');

async function checkSetup() {
  console.log('=== Diagnóstico do Sistema ArtnaWEB Monitor ===\n');
  
  let hasErrors = false;
  
  // 1. Verificar variáveis de ambiente
  console.log('1. Verificando variáveis de ambiente...');
  const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.log(`   ❌ ${envVar} não está configurado`);
      hasErrors = true;
    } else {
      const value = envVar === 'DB_PASS' || envVar === 'JWT_SECRET' 
        ? '***' 
        : process.env[envVar];
      console.log(`   ✓ ${envVar} = ${value}`);
    }
  }
  console.log('');
  
  // 2. Verificar conexão com banco de dados
  console.log('2. Verificando conexão com banco de dados...');
  try {
    await db.execute('SELECT 1');
    console.log('   ✓ Conexão com banco de dados OK');
  } catch (error) {
    console.log(`   ❌ Erro de conexão: ${error.message}`);
    console.log('');
    console.log('   Verifique:');
    console.log('   - MySQL está rodando?');
    console.log('   - As credenciais no .env estão corretas?');
    console.log('   - O banco de dados existe?');
    hasErrors = true;
    console.log('');
    return;
  }
  console.log('');
  
  // 3. Verificar se as tabelas existem
  console.log('3. Verificando tabelas do banco de dados...');
  const requiredTables = ['users', 'sites', 'clients', 'settings'];
  for (const table of requiredTables) {
    try {
      const [rows] = await db.execute(`SHOW TABLES LIKE '${table}'`);
      if (rows.length > 0) {
        console.log(`   ✓ Tabela '${table}' existe`);
      } else {
        console.log(`   ❌ Tabela '${table}' não existe`);
        hasErrors = true;
      }
    } catch (error) {
      console.log(`   ❌ Erro ao verificar tabela '${table}': ${error.message}`);
      hasErrors = true;
    }
  }
  console.log('');
  
  // 4. Verificar se o usuário admin existe
  console.log('4. Verificando usuário admin...');
  try {
    const [users] = await db.execute('SELECT id, username FROM users WHERE username = ?', ['admin']);
    if (users.length > 0) {
      console.log('   ✓ Usuário admin existe');
    } else {
      console.log('   ❌ Usuário admin não existe');
      console.log('   Execute: node scripts/create-admin.js');
      hasErrors = true;
    }
  } catch (error) {
    console.log(`   ❌ Erro ao verificar usuário: ${error.message}`);
    hasErrors = true;
  }
  console.log('');
  
  // 5. Verificar configurações
  console.log('5. Verificando configurações do sistema...');
  try {
    const [settings] = await db.execute('SELECT COUNT(*) as count FROM settings');
    if (settings[0].count > 0) {
      console.log(`   ✓ ${settings[0].count} configurações encontradas`);
    } else {
      console.log('   ⚠ Nenhuma configuração encontrada (pode ser normal se o banco foi criado recentemente)');
    }
  } catch (error) {
    console.log(`   ❌ Erro ao verificar configurações: ${error.message}`);
    hasErrors = true;
  }
  console.log('');
  
  // Resumo
  if (hasErrors) {
    console.log('=== RESUMO ===');
    console.log('❌ Foram encontrados problemas. Corrija-os antes de continuar.');
    console.log('');
    console.log('Próximos passos:');
    console.log('1. Se o banco não existe, execute o arquivo db.sql no MySQL');
    console.log('2. Se o usuário admin não existe, execute: node scripts/create-admin.js');
    console.log('3. Verifique se o MySQL está rodando');
    console.log('');
    process.exit(1);
  } else {
    console.log('=== RESUMO ===');
    console.log('✓ Tudo parece estar configurado corretamente!');
    console.log('');
    console.log('Se ainda estiver tendo problemas:');
    console.log('1. Verifique os logs do servidor (console onde rodou npm run dev)');
    console.log('2. Certifique-se de que o backend está rodando na porta 3001');
    console.log('3. Certifique-se de que o frontend está rodando na porta 3000');
    console.log('');
    process.exit(0);
  }
}

checkSetup().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});

