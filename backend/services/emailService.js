/**
 * Email Service
 */

const nodemailer = require('nodemailer');
const db = require('../config/database');

// Obter configuração de email do banco
async function getEmailSettings() {
  try {
    const [settings] = await db.execute(
      'SELECT setting_value FROM settings WHERE setting_key = ?',
      ['alert_email']
    );
    
    if (settings.length > 0 && settings[0].setting_value) {
      const emailValue = settings[0].setting_value;
      
      // Se contém vírgula, é múltiplos emails
      if (emailValue.includes(',')) {
        // Retornar array de emails (remover espaços e filtrar vazios)
        const emails = emailValue.split(',').map(e => e.trim()).filter(e => e);
        return emails.length > 0 ? emails : process.env.SMTP_FROM;
      }
      
      // Email único
      return emailValue;
    }
    
    // Fallback para email do .env
    return process.env.SMTP_FROM;
  } catch (error) {
    console.error('Error getting email settings:', error);
    return process.env.SMTP_FROM;
  }
}

// Obter template de email do banco
async function getEmailTemplate() {
  try {
    const [settings] = await db.execute(
      'SELECT setting_value FROM settings WHERE setting_key = ?',
      ['email_template']
    );
    
    if (settings.length > 0 && settings[0].setting_value) {
      return settings[0].setting_value;
    }
    return null; // Retornar null para usar template padrão
  } catch (error) {
    console.error('Error getting email template:', error);
    return null;
  }
}

// Obter assunto do email do banco
async function getEmailSubject() {
  try {
    const [settings] = await db.execute(
      'SELECT setting_value FROM settings WHERE setting_key = ?',
      ['email_subject']
    );
    
    if (settings.length > 0 && settings[0].setting_value) {
      return settings[0].setting_value;
    }
    return '[Alerta] Problema detectado em {{domain}}';
  } catch (error) {
    console.error('Error getting email subject:', error);
    return '[Alerta] Problema detectado em {{domain}}';
  }
}

// Configurar transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // false para 587, true para 465
  requireTLS: true, // Força uso de STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    // Não rejeitar certificados auto-assinados (útil para servidores internos)
    rejectUnauthorized: false
  },
  debug: process.env.NODE_ENV === 'development', // Debug apenas em desenvolvimento
  logger: process.env.NODE_ENV === 'development'
});

/**
 * Enviar e-mail de alerta
 */
function getStatusText(status) {
  const statusMap = {
    'clean': 'Verificado',
    'warning': 'Verificar',
    'infected': 'Infectado',
    'unknown': 'Desconhecido'
  };
  return statusMap[status] || 'Desconhecido';
}

// Gerar HTML de avisos
function generateWarningsHTML(scanData) {
  if (!scanData.warnings || typeof scanData.warnings !== 'object') {
    return '';
  }

  let warningsHTML = '';
  const warningsList = [];

  // Iterar sobre todos os tipos de warnings
  for (const warningType in scanData.warnings) {
    const warnings = scanData.warnings[warningType];
    if (Array.isArray(warnings) && warnings.length > 0) {
      warnings.forEach(warning => {
        warningsList.push(warning.msg || warning.type || warning || 'Aviso detectado');
      });
    } else if (warnings && typeof warnings === 'object' && Object.keys(warnings).length > 0) {
      warningsList.push(JSON.stringify(warnings));
    }
  }

  if (warningsList.length > 0) {
    warningsHTML = '<div class="alert"><h3>Avisos:</h3><ul>';
    warningsList.forEach(warning => {
      warningsHTML += `<li>${warning}</li>`;
    });
    warningsHTML += '</ul></div>';
  }

  return warningsHTML;
}

// Gerar HTML de malware
function generateMalwareHTML(scanData) {
  if (!scanData.malware) {
    return '';
  }

  let malwareHTML = '';
  const malwareList = [];

  if (Array.isArray(scanData.malware)) {
    scanData.malware.forEach(m => {
      malwareList.push(m);
    });
  } else if (typeof scanData.malware === 'string' && scanData.malware.trim() !== '') {
    malwareList.push(scanData.malware);
  } else if (scanData.malware !== null && scanData.malware !== false) {
    malwareList.push(JSON.stringify(scanData.malware));
  }

  if (malwareList.length > 0) {
    malwareHTML = '<div class="danger"><h3>Malware Detectado:</h3><ul>';
    malwareList.forEach(m => {
      malwareHTML += `<li>${m}</li>`;
    });
    malwareHTML += '</ul></div>';
  }

  return malwareHTML;
}

// Substituir variáveis no template
function replaceTemplateVariables(template, variables) {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
}

async function sendAlertEmail(domain, status, scanData) {
  try {
    const statusText = getStatusText(status);
    const alertEmail = await getEmailSettings();
    const emailSubject = await getEmailSubject();
    const emailTemplate = await getEmailTemplate();

    // Preparar variáveis para o template
    const scanDate = new Date().toLocaleString('pt-BR');
    const warningsHTML = generateWarningsHTML(scanData);
    const malwareHTML = generateMalwareHTML(scanData);
    const detailsJSON = JSON.stringify(scanData, null, 2);

    const variables = {
      domain: domain,
      status: status,
      statusText: statusText,
      scanDate: scanDate,
      warnings: warningsHTML,
      malware: malwareHTML,
      details: detailsJSON
    };

    // Se há template personalizado, usar ele
    let html;
    if (emailTemplate) {
      html = replaceTemplateVariables(emailTemplate, variables);
    } else {
      // Template padrão (fallback)
      html = `
        <h2>Alerta de Monitoramento - ArtnaWEB Monitor</h2>
        <p><strong>Domínio:</strong> ${domain}</p>
        <p><strong>Status:</strong> ${statusText}</p>
        <p><strong>Data da Varredura:</strong> ${scanDate}</p>
        
        ${warningsHTML}
        ${malwareHTML}
        
        <h3>Detalhes da Varredura:</h3>
        <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto;">
${detailsJSON}
        </pre>
        
        <hr><p><small>Este é um e-mail automático do sistema ArtnaWEB Monitor.</small></p>
      `;
    }

    // Substituir variáveis no assunto
    const subject = replaceTemplateVariables(emailSubject, {
      domain: domain,
      status: statusText
    });

    // Enviar e-mail
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'ArtnaWEB Monitor'}" <${process.env.SMTP_USER}>`,
      to: alertEmail,
      subject: subject,
      html: html,
      text: html.replace(/<[^>]*>/g, '') // Versão texto
    });

    console.log('Email sent:', info.messageId);
    return true;

  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
}

/**
 * Enviar e-mail de alerta de uptime (site caiu ou voltou)
 */
async function sendUptimeAlertEmail(domain, eventType, uptimeData) {
  try {
    const alertEmail = await getEmailSettings();
    
    if (!alertEmail) {
      console.error('Email de alerta não configurado');
      return false;
    }

    // Preparar dados do email
    const eventDate = new Date().toLocaleString('pt-BR');
    const statusText = eventType === 'down' ? 'Offline' : 'Online';
    const statusColor = eventType === 'down' ? '#f87171' : '#34d399';
    
    let subject = '';
    let html = '';

    if (eventType === 'down') {
      // Site caiu
      subject = `[Alerta Uptime] Site ${domain} está offline`;
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f87171; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .alert { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .info { background: #e7f3ff; border: 1px solid #2196F3; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
            .status-badge { display: inline-block; padding: 8px 16px; background: ${statusColor}; color: white; border-radius: 4px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Alerta de Uptime - Site Offline</h2>
            </div>
            <div class="content">
              <p><strong>Domínio:</strong> ${domain}</p>
              <p><strong>Status:</strong> <span class="status-badge">${statusText}</span></p>
              <p><strong>Data/Hora:</strong> ${eventDate}</p>
              
              <div class="alert">
                <h3>Site Indisponível</h3>
                <p>O site <strong>${domain}</strong> está offline ou não está respondendo.</p>
                <p>Por favor, verifique o status do servidor e tome as medidas necessárias.</p>
              </div>
              
              ${uptimeData.responseTime ? `<div class="info"><p><strong>Tempo de Resposta:</strong> ${uptimeData.responseTime}ms</p></div>` : ''}
              ${uptimeData.uptimeRatio ? `<div class="info"><p><strong>Uptime:</strong> ${uptimeData.uptimeRatio}%</p></div>` : ''}
              
              <div class="footer">
                <p>Este é um e-mail automático do sistema ArtnaWEB Monitor.</p>
                <p>Por favor, não responda este e-mail.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (eventType === 'up') {
      // Site voltou
      subject = `[Alerta Uptime] Site ${domain} voltou ao ar`;
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #34d399; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .success { background: #d4edda; border: 1px solid #28a745; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .info { background: #e7f3ff; border: 1px solid #2196F3; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
            .status-badge { display: inline-block; padding: 8px 16px; background: ${statusColor}; color: white; border-radius: 4px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Alerta de Uptime - Site Online</h2>
            </div>
            <div class="content">
              <p><strong>Domínio:</strong> ${domain}</p>
              <p><strong>Status:</strong> <span class="status-badge">${statusText}</span></p>
              <p><strong>Data/Hora:</strong> ${eventDate}</p>
              
              <div class="success">
                <h3>Site Voltou ao Ar</h3>
                <p>O site <strong>${domain}</strong> voltou a estar online e respondendo normalmente.</p>
                <p>Status anterior: ${uptimeData.previousStatus || 'Desconhecido'}</p>
              </div>
              
              ${uptimeData.responseTime ? `<div class="info"><p><strong>Tempo de Resposta:</strong> ${uptimeData.responseTime}ms</p></div>` : ''}
              ${uptimeData.uptimeRatio ? `<div class="info"><p><strong>Uptime:</strong> ${uptimeData.uptimeRatio}%</p></div>` : ''}
              
              <div class="footer">
                <p>Este é um e-mail automático do sistema ArtnaWEB Monitor.</p>
                <p>Por favor, não responda este e-mail.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    // Enviar e-mail
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'ArtnaWEB Monitor'}" <${process.env.SMTP_USER}>`,
      to: alertEmail,
      subject: subject,
      html: html,
      text: html.replace(/<[^>]*>/g, '') // Versão texto
    });

    console.log('[Uptime Alert] Email enviado:', info.messageId);
    return true;

  } catch (error) {
    console.error('[Uptime Alert] Erro ao enviar email:', error);
    return false;
  }
}

module.exports = {
  sendAlertEmail,
  sendUptimeAlertEmail
};
