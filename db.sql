-- ArtnaWEB Monitor - Database Schema
-- MySQL Database Creation Script
-- 
-- IMPORTANTE: 
-- 1. Crie o banco de dados via cPanel primeiro (ou use o banco existente)
-- 2. Selecione o banco de dados no phpMyAdmin antes de importar este arquivo
-- 3. Este arquivo não cria o banco, apenas as tabelas
-- 4. Se você receber erro sobre coluna client_id não existir, execute o arquivo db-fix.sql

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de clientes (criada ANTES de sites para poder referenciar)
CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de sites
CREATE TABLE IF NOT EXISTS sites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    domain VARCHAR(255) NOT NULL UNIQUE,
    last_status VARCHAR(50) DEFAULT NULL,
    last_scan DATETIME DEFAULT NULL,
    details TEXT DEFAULT NULL,
    alert_sent TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adicionar coluna client_id se não existir
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'sites' 
               AND column_name = 'client_id');
SET @sqlstmt := IF(@exist > 0, 
    'SELECT ''Coluna client_id já existe'' AS message;',
    'ALTER TABLE sites ADD COLUMN client_id INT DEFAULT NULL AFTER alert_sent;');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Adicionar índice para client_id (se não existir)
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'sites' 
               AND index_name = 'idx_client_id');
SET @sqlstmt := IF(@exist > 0, 
    'SELECT ''Índice idx_client_id já existe'' AS message;',
    'ALTER TABLE sites ADD INDEX idx_client_id (client_id);');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Adicionar foreign key para client_id (se não existir)
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
               WHERE table_schema = DATABASE() 
               AND table_name = 'sites' 
               AND constraint_name = 'fk_sites_client');
SET @sqlstmt := IF(@exist > 0,
    'SELECT ''Foreign key fk_sites_client já existe'' AS message;',
    'ALTER TABLE sites ADD CONSTRAINT fk_sites_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL ON UPDATE CASCADE;');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Adicionar colunas do UptimeRobot se não existirem
-- IMPORTANTE: Estas colunas serão adicionadas APÓS client_id
-- Se você receber erro sobre client_id não existir, execute primeiro a parte de client_id acima

-- Adicionar uptimerobot_monitor_id
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'sites' 
               AND column_name = 'uptimerobot_monitor_id');

-- Adicionar após client_id (assumindo que client_id já existe ou foi criado acima)
SET @sqlstmt := IF(@exist > 0, 
    'SELECT ''Coluna uptimerobot_monitor_id já existe'' AS message;',
    'ALTER TABLE sites ADD COLUMN uptimerobot_monitor_id VARCHAR(100) DEFAULT NULL AFTER client_id;');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Adicionar uptime_status
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'sites' 
               AND column_name = 'uptime_status');
SET @sqlstmt := IF(@exist > 0, 
    'SELECT ''Coluna uptime_status já existe'' AS message;',
    'ALTER TABLE sites ADD COLUMN uptime_status VARCHAR(50) DEFAULT NULL AFTER uptimerobot_monitor_id;');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Adicionar uptime_last_check
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'sites' 
               AND column_name = 'uptime_last_check');
SET @sqlstmt := IF(@exist > 0, 
    'SELECT ''Coluna uptime_last_check já existe'' AS message;',
    'ALTER TABLE sites ADD COLUMN uptime_last_check DATETIME DEFAULT NULL AFTER uptime_status;');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Adicionar uptime_uptime_ratio
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'sites' 
               AND column_name = 'uptime_uptime_ratio');
SET @sqlstmt := IF(@exist > 0, 
    'SELECT ''Coluna uptime_uptime_ratio já existe'' AS message;',
    'ALTER TABLE sites ADD COLUMN uptime_uptime_ratio DECIMAL(5,2) DEFAULT NULL AFTER uptime_last_check;');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Adicionar uptime_response_time
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'sites' 
               AND column_name = 'uptime_response_time');
SET @sqlstmt := IF(@exist > 0, 
    'SELECT ''Coluna uptime_response_time já existe'' AS message;',
    'ALTER TABLE sites ADD COLUMN uptime_response_time INT DEFAULT NULL AFTER uptime_uptime_ratio;');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Adicionar índice para uptimerobot_monitor_id (se não existir)
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'sites' 
               AND index_name = 'idx_uptimerobot_monitor_id');
SET @sqlstmt := IF(@exist > 0, 
    'SELECT ''Índice idx_uptimerobot_monitor_id já existe'' AS message;',
    'ALTER TABLE sites ADD INDEX idx_uptimerobot_monitor_id (uptimerobot_monitor_id);');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Adicionar coluna para rastrear último status de uptime (para notificações)
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'sites' 
               AND column_name = 'last_uptime_status');
SET @sqlstmt := IF(@exist > 0, 
    'SELECT ''Coluna last_uptime_status já existe'' AS message;',
    'ALTER TABLE sites ADD COLUMN last_uptime_status VARCHAR(50) DEFAULT NULL AFTER uptime_status;');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tabela de histórico de varreduras
CREATE TABLE IF NOT EXISTS scan_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    site_id INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    scan_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    details TEXT DEFAULT NULL,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    INDEX idx_site_id (site_id),
    INDEX idx_scan_date (scan_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de histórico de relatórios enviados
CREATE TABLE IF NOT EXISTS report_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    site_id INT DEFAULT NULL,
    report_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    report_type VARCHAR(50) DEFAULT 'manual',
    email_sent VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'sent',
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL,
    INDEX idx_client_id (client_id),
    INDEX idx_site_id (site_id),
    INDEX idx_report_date (report_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT DEFAULT NULL,
    setting_type VARCHAR(50) DEFAULT 'string',
    description TEXT DEFAULT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir configurações padrão
INSERT INTO settings (setting_key, setting_value, setting_type, description) VALUES
('alert_email', 'contato@artnaweb.com.br', 'string', 'Email que receberá os alertas de segurança'),
('uptimerobot_api_key', '', 'string', 'Chave de API do UptimeRobot para monitoramento de uptime'),
('uptimerobot_enabled', '0', 'boolean', 'Habilitar integração com UptimeRobot'),
('scan_interval_enabled', '0', 'boolean', 'Habilitar scan automático'),
('scan_interval_value', '6', 'number', 'Valor do intervalo de scan'),
('scan_interval_unit', 'hours', 'string', 'Unidade do intervalo (minutes, hours, days)'),
('scan_timeout', '30', 'number', 'Tempo limite para cada scan (segundos)'),
('max_concurrent_scans', '5', 'number', 'Número máximo de scans simultâneos'),
('email_subject', '[Alerta] Problema detectado em {{domain}}', 'string', 'Assunto do email de notificação'),
('email_template', '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset=\"UTF-8\">\n  <style>\n    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }\n    .container { max-width: 600px; margin: 0 auto; padding: 20px; }\n    .header { background: #667eea; color: white; padding: 20px; border-radius: 8px 8px 0 0; }\n    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }\n    .alert { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 15px 0; }\n    .danger { background: #f8d7da; border: 1px solid #dc3545; padding: 15px; border-radius: 5px; margin: 15px 0; }\n    ul { margin: 10px 0; padding-left: 20px; }\n    pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }\n    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }\n  </style>\n</head>\n<body>\n  <div class=\"container\">\n    <div class=\"header\">\n      <h2>Alerta de Monitoramento - ArtnaWEB Monitor</h2>\n    </div>\n    <div class=\"content\">\n      <p><strong>Domínio:</strong> {{domain}}</p>\n      <p><strong>Status:</strong> <span style=\"font-weight: bold; color: #dc3545;\">{{statusText}}</span></p>\n      <p><strong>Data da Varredura:</strong> {{scanDate}}</p>\n      \n      {{warnings}}\n      {{malware}}\n      \n      <h3>Detalhes da Varredura:</h3>\n      <pre>{{details}}</pre>\n      \n      <div class=\"footer\">\n        <p>Este é um e-mail automático do sistema ArtnaWEB Monitor.</p>\n        <p>Por favor, não responda este e-mail.</p>\n      </div>\n    </div>\n  </div>\n</body>\n</html>', 'text', 'Template HTML do email de notificação'),
('report_email_subject', 'Relatório de Monitoramento - {{clientName}}', 'string', 'Assunto do email de relatório'),
('report_email_template', '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset=\"UTF-8\">\n  <style>\n    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }\n    .container { max-width: 800px; margin: 0 auto; padding: 20px; }\n    .header { background: #667eea; color: white; padding: 20px; border-radius: 8px 8px 0 0; }\n    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }\n    .site-card { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #667eea; }\n    .status-clean { border-left-color: #34d399; }\n    .status-warning { border-left-color: #fbbf24; }\n    .status-infected { border-left-color: #f87171; }\n    .status-unknown { border-left-color: #9ca3af; }\n    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }\n    table { width: 100%; border-collapse: collapse; margin: 15px 0; }\n    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }\n    th { background: #f5f5f5; }\n  </style>\n</head>\n<body>\n  <div class=\"container\">\n    <div class=\"header\">\n      <h2>Relatório de Monitoramento - ArtnaWEB Monitor</h2>\n    </div>\n    <div class=\"content\">\n      <p>Olá <strong>{{clientName}}</strong>,</p>\n      <p>Segue o relatório de monitoramento dos seus sites:</p>\n      \n      {{sitesList}}\n      \n      <div class=\"footer\">\n        <p>Este é um relatório automático do sistema ArtnaWEB Monitor.</p>\n        <p>Por favor, não responda este e-mail.</p>\n      </div>\n    </div>\n  </div>\n</body>\n</html>', 'text', 'Template HTML do email de relatório'),
('report_interval_enabled', '0', 'boolean', 'Habilitar envio automático de relatórios'),
('report_interval_value', '7', 'number', 'Valor do intervalo de envio de relatórios'),
('report_interval_unit', 'days', 'string', 'Unidade do intervalo (minutes, hours, days)')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

-- NOTA: O usuário admin será criado através do script create-admin.js
-- Execute: node backend/scripts/create-admin.js
-- OU use a rota de teste: POST http://localhost:3001/api/test/create-admin
