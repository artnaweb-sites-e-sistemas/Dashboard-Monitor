/**
 * Script para criar usuário admin
 * Execute: node scripts/create-admin.js
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../config/database');

async function createAdmin() {
  try {
    const username = 'admin';
    const password = 'admin123';
    
    console.log('Criando/Atualizando usuário admin...');
    console.log('');
    
    // Verificar conexão com banco
    try {
      await db.execute('SELECT 1');
      console.log('Conexão com banco de dados OK');
    } catch (error) {
      console.error('Erro de conexão com banco:', error.message);
      console.error('');
      console.error('Verifique:');
      console.error('1. MySQL está rodando?');
      console.error('2. As credenciais no .env estão corretas?');
      console.error('3. O banco artnaweb_monitor existe?');
      process.exit(1);
    }
    
    // Verificar se usuário já existe
    const [users] = await db.execute(
      'SELECT id, username FROM users WHERE username = ?',
      [username]
    );
    
    // Gerar hash da senha
    const passwordHash = await bcrypt.hash(password, 10);
    
    if (users.length > 0) {
      // Atualizar senha
      await db.execute(
        'UPDATE users SET password = ? WHERE username = ?',
        [passwordHash, username]
      );
      console.log('Senha do usuário admin atualizada!');
    } else {
      // Criar usuário
      await db.execute(
        'INSERT INTO users (username, password) VALUES (?, ?)',
        [username, passwordHash]
      );
      console.log('Usuário admin criado!');
    }
    
    console.log('');
    console.log('Credenciais:');
    console.log('   Usuário: admin');
    console.log('   Senha: admin123');
    console.log('');
    console.log('Pronto! Agora você pode fazer login.');
    console.log('');
    
    process.exit(0);
    
  } catch (error) {
    console.error('');
    console.error('Erro:', error.message);
    console.error('');
    console.error('Stack:', error.stack);
    console.error('');
    process.exit(1);
  }
}

createAdmin();
