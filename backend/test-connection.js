/**
 * Script de diagnóstico para verificar conexão com banco de dados
 * Execute: node test-connection.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function testConnection() {
  console.log('🔍 Diagnóstico de Conexão com Banco de Dados\n');
  console.log('=' .repeat(50));
  
  // 1. Verificar variáveis de ambiente
  console.log('\n1️⃣ Verificando variáveis de ambiente:');
  console.log(`   DB_HOST: ${process.env.DB_HOST || 'NÃO DEFINIDO'}`);
  console.log(`   DB_USER: ${process.env.DB_USER || 'NÃO DEFINIDO'}`);
  console.log(`   DB_PASS: ${process.env.DB_PASS !== undefined ? (process.env.DB_PASS ? '***' : '(vazia)') : 'NÃO DEFINIDO'}`);
  console.log(`   DB_NAME: ${process.env.DB_NAME || 'NÃO DEFINIDO'}`);
  console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Configurado' : '❌ NÃO CONFIGURADO'}`);
  
  // 2. Tentar conectar
  console.log('\n2️⃣ Testando conexão com banco de dados...');
  
  const dbName = process.env.DB_NAME || 'artnaweb_monitor';
  
  try {
    // Primeiro, conectar sem especificar o banco para listar bancos
    const connectionWithoutDB = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || ''
    });
    
    console.log('   ✅ Conexão estabelecida com MySQL!');
    
    // 3. Verificar se o banco existe
    console.log('\n3️⃣ Verificando banco de dados...');
    
    try {
      // Listar bancos usando query direta (não prepared statement)
      const [databases] = await connectionWithoutDB.query('SHOW DATABASES');
      const dbNames = databases.map(db => Object.values(db)[0]);
      
      console.log(`   Bancos de dados encontrados: ${dbNames.length}`);
      if (dbNames.includes(dbName)) {
        console.log(`   ✅ Banco de dados "${dbName}" existe`);
      } else {
        console.log(`   ❌ Banco de dados "${dbName}" NÃO existe`);
        console.log('   Bancos disponíveis:');
        dbNames.forEach(name => {
          console.log(`      - ${name}`);
        });
        console.log('');
        console.log('   💡 SOLUÇÃO:');
        console.log('   1. Crie o banco no phpMyAdmin: CREATE DATABASE artnaweb_monitor;');
        console.log('   2. Ou atualize DB_NAME no .env com um dos bancos existentes');
        await connectionWithoutDB.end();
        process.exit(1);
      }
      
      await connectionWithoutDB.end();
    } catch (error) {
      console.log(`   ⚠️  Não foi possível listar bancos: ${error.message}`);
      console.log('   Mas vamos tentar conectar diretamente...');
    }
    
    // Agora conectar ao banco específico
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: dbName
    });
    
    console.log(`   ✅ Conectado ao banco "${dbName}"`);
    
    // 4. Verificar se a tabela users existe
    console.log('\n4️⃣ Verificando tabela users...');
    try {
      const [tables] = await connection.execute("SHOW TABLES LIKE 'users'");
      
      if (tables.length > 0) {
        console.log('   ✅ Tabela "users" existe');
        
        // 5. Verificar usuários
        console.log('\n5️⃣ Verificando usuários cadastrados...');
        const [users] = await connection.execute('SELECT id, username FROM users');
        
        if (users.length > 0) {
          console.log(`   ✅ Encontrados ${users.length} usuário(s):`);
          users.forEach(user => {
            console.log(`      - ID: ${user.id}, Username: ${user.username}`);
          });
        } else {
          console.log('   ⚠️  Nenhum usuário encontrado na tabela');
          console.log('   💡 Execute: node scripts/create-admin.js');
        }
        
        // 6. Verificar estrutura da tabela
        console.log('\n6️⃣ Verificando estrutura da tabela users...');
        const [columns] = await connection.execute('DESCRIBE users');
        console.log('   Colunas encontradas:');
        columns.forEach(col => {
          console.log(`      - ${col.Field} (${col.Type})`);
        });
        
        // 7. Verificar se há senha hashada
        if (users.length > 0) {
          console.log('\n7️⃣ Verificando hash de senha...');
          const [userWithPassword] = await connection.execute(
            'SELECT password FROM users WHERE username = ?',
            [users[0].username]
          );
          if (userWithPassword.length > 0 && userWithPassword[0].password) {
            const hash = userWithPassword[0].password;
            if (hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
              console.log('   ✅ Senha está hashada corretamente (bcrypt)');
            } else {
              console.log('   ⚠️  Senha pode não estar hashada corretamente');
            }
          }
        }
        
      } else {
        console.log('   ❌ Tabela "users" NÃO existe');
        console.log('   💡 Importe o schema: mysql -u root artnaweb_monitor < db.sql');
        await connection.end();
        process.exit(1);
      }
      
    } catch (error) {
      console.log(`   ❌ Erro ao verificar tabela: ${error.message}`);
      await connection.end();
      process.exit(1);
    }
    
    // 8. Testar query de login
    console.log('\n8️⃣ Testando query de login...');
    try {
      const [testUsers] = await connection.execute(
        'SELECT id, username, password FROM users WHERE username = ?',
        ['admin']
      );
      
      if (testUsers.length > 0) {
        console.log('   ✅ Query de login funciona');
        console.log(`   ✅ Usuário "admin" encontrado (senha hash: ${testUsers[0].password.substring(0, 20)}...)`);
      } else {
        console.log('   ⚠️  Usuário "admin" não encontrado');
        console.log('   💡 Execute: node scripts/create-admin.js');
      }
    } catch (error) {
      console.log(`   ❌ Erro ao testar query: ${error.message}`);
    }
    
    await connection.end();
    
    console.log('\n' + '='.repeat(50));
    console.log('\n✅ Diagnóstico concluído!');
    console.log('\n📋 Resumo:');
    console.log('   - Verifique os logs acima para identificar problemas');
    console.log('   - Se tudo estiver OK, o problema pode ser no código do backend');
    console.log('   - Verifique os logs do servidor ao tentar fazer login');
    
  } catch (error) {
    console.log('   ❌ Erro ao conectar:', error.message);
    console.log('\n💡 Possíveis soluções:');
    console.log('   1. Verifique se o MySQL do XAMPP está rodando');
    console.log('   2. Verifique as credenciais no arquivo .env');
    console.log('   3. Verifique se o banco de dados existe');
    console.log('   4. Verifique se o usuário tem permissão para acessar o banco');
    console.log('\n🔍 Detalhes do erro:');
    console.log('   Código:', error.code);
    console.log('   Mensagem:', error.message);
    process.exit(1);
  }
}

testConnection();

