/**
 * Script para inicializar configurações no banco de dados
 */

require('dotenv').config();
const db = require('../config/database');

async function initSettings() {
  try {
    console.log('Inicializando configurações...');
    console.log('');
    
    // Verificar conexão
    try {
      await db.execute('SELECT 1');
      console.log('Conexão com banco de dados OK');
    } catch (error) {
      console.error('Erro de conexão com banco:', error.message);
      process.exit(1);
    }

    // Criar tabela de configurações se não existir
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          setting_key VARCHAR(100) NOT NULL UNIQUE,
          setting_value TEXT DEFAULT NULL,
          setting_type VARCHAR(50) DEFAULT 'string',
          description TEXT DEFAULT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('Tabela settings criada/verificada');
    } catch (error) {
      console.error('Erro ao criar tabela:', error.message);
      process.exit(1);
    }

    // Inserir configurações padrão
    const defaultEmailTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #667eea; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
    .alert { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .danger { background: #f8d7da; border: 1px solid #dc3545; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .info { background: #d1ecf1; border: 1px solid #0c5460; padding: 15px; border-radius: 5px; margin: 15px 0; }
    ul { margin: 10px 0; padding-left: 20px; }
    pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Alerta de Monitoramento - ArtnaWEB Monitor</h2>
    </div>
    <div class="content">
      <p><strong>Domínio:</strong> {{domain}}</p>
      <p><strong>Status:</strong> <span style="font-weight: bold; color: #dc3545;">{{statusText}}</span></p>
      <p><strong>Data da Varredura:</strong> {{scanDate}}</p>
      
      {{warnings}}
      {{malware}}
      
      <h3>Detalhes da Varredura:</h3>
      <pre>{{details}}</pre>
      
      <div class="footer">
        <p>Este é um e-mail automático do sistema ArtnaWEB Monitor.</p>
        <p>Por favor, não responda este e-mail.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const defaultSettings = [
      {
        key: 'alert_email',
        value: process.env.SMTP_FROM || 'contato@artnaweb.com.br',
        type: 'string',
        description: 'Email que receberá os alertas de segurança'
      },
      {
        key: 'scan_interval_enabled',
        value: '0',
        type: 'boolean',
        description: 'Habilitar scan automático'
      },
      {
        key: 'scan_interval_value',
        value: '6',
        type: 'number',
        description: 'Valor do intervalo de scan'
      },
      {
        key: 'scan_interval_unit',
        value: 'hours',
        type: 'string',
        description: 'Unidade do intervalo (minutes, hours, days)'
      },
      {
        key: 'scan_timeout',
        value: '30',
        type: 'number',
        description: 'Tempo limite para cada scan (segundos)'
      },
      {
        key: 'max_concurrent_scans',
        value: '3',
        type: 'number',
        description: 'Número máximo de scans simultâneos'
      },
      {
        key: 'email_subject',
        value: '[Alerta] Problema detectado em {{domain}}',
        type: 'string',
        description: 'Assunto do email de notificação (use {{domain}} e {{status}} como variáveis)'
      },
      {
        key: 'email_template',
        value: defaultEmailTemplate,
        type: 'text',
        description: 'Template HTML do email de notificação'
      },
      {
        key: 'report_email_subject',
        value: 'Relatório de Monitoramento - {{clientName}}',
        type: 'string',
        description: 'Assunto do email de relatório (use {{clientName}} como variável)'
      },
      {
        key: 'report_email_template',
        value: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: #667eea; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
    .site-card { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #667eea; }
    .status-clean { border-left-color: #34d399; }
    .status-warning { border-left-color: #fbbf24; }
    .status-infected { border-left-color: #f87171; }
    .status-unknown { border-left-color: #9ca3af; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Relatório de Monitoramento - ArtnaWEB Monitor</h2>
    </div>
    <div class="content">
      <p>Olá <strong>{{clientName}}</strong>,</p>
      <p>Segue o relatório de monitoramento dos seus sites:</p>
      
      {{sitesList}}
      
      <div class="footer">
        <p>Este é um relatório automático do sistema ArtnaWEB Monitor.</p>
        <p>Por favor, não responda este e-mail.</p>
      </div>
    </div>
  </div>
</body>
</html>`,
        type: 'text',
        description: 'Template HTML do email de relatório (use {{clientName}}, {{sitesList}}, {{reportDate}} como variáveis)'
      },
      {
        key: 'report_interval_enabled',
        value: '0',
        type: 'boolean',
        description: 'Habilitar envio automático de relatórios'
      },
      {
        key: 'report_interval_value',
        value: '7',
        type: 'number',
        description: 'Valor do intervalo de envio de relatórios'
      },
      {
        key: 'report_interval_unit',
        value: 'days',
        type: 'string',
        description: 'Unidade do intervalo (minutes, hours, days)'
      }
    ];

    for (const setting of defaultSettings) {
      try {
        await db.execute(`
          INSERT INTO settings (setting_key, setting_value, setting_type, description)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            setting_type = VALUES(setting_type),
            description = VALUES(description)
        `, [setting.key, setting.value, setting.type, setting.description]);
        console.log(`Configuração ${setting.key} inicializada`);
      } catch (error) {
        console.error(`Erro ao inserir ${setting.key}:`, error.message);
      }
    }

    console.log('');
    console.log('Configurações inicializadas com sucesso!');
    console.log('');
    console.log('Configurações padrão:');
    defaultSettings.forEach(s => {
      console.log(`   ${s.key}: ${s.value} (${s.type})`);
    });
    console.log('');

  } catch (error) {
    console.error('Erro ao inicializar configurações:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

initSettings();

