/**
 * Database Configuration
 */

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'artnaweb_monitor',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// Test connection
pool.getConnection()
  .then(connection => {
    console.log('Database connected successfully');
    console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   Database: ${process.env.DB_NAME || 'artnaweb_monitor'}`);
    connection.release();
  })
  .catch(err => {
    console.error('Database connection error:', err.message);
    console.error('   Verifique as configurações no arquivo .env');
  });

module.exports = pool;

