/**
 * Report Service - Generate and send reports
 */

const nodemailer = require('nodemailer');
const db = require('../config/database');
const parseScanDetails = require('./scanDetailsParser').parseScanDetails;
const { getProfessionalReportTemplate, formatSiteCardProfessional } = require('./reportTemplate');

// Transporter (reutilizar do emailService se possível)
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

async function getReportSettings() {
  try {
    const [settingsRows] = await db.execute(
      `SELECT setting_key, setting_value FROM settings 
       WHERE setting_key IN ('report_email_subject', 'report_email_template', 'report_interval_enabled', 'report_interval_value', 'report_interval_unit')`
    );

    const settings = settingsRows.reduce((acc, row) => {
      acc[row.setting_key] = row.setting_value;
      return acc;
    }, {});

    return {
      subject: settings.report_email_subject || 'Relatório de Monitoramento - {{clientName}}',
      template: settings.report_email_template || getDefaultReportTemplate(),
      intervalEnabled: settings.report_interval_enabled === '1' || settings.report_interval_enabled === 'true',
      intervalValue: parseInt(settings.report_interval_value || '7'),
      intervalUnit: settings.report_interval_unit || 'days'
    };
  } catch (error) {
    console.error('Error getting report settings:', error);
    return {
      subject: 'Relatório de Monitoramento - {{clientName}}',
      template: getDefaultReportTemplate(),
      intervalEnabled: false,
      intervalValue: 7,
      intervalUnit: 'days'
    };
  }
}

function getDefaultReportTemplate() {
  // Usar o template profissional por padrão
  return getProfessionalReportTemplate();
}

function getStatusText(status) {
  const statusMap = {
    'clean': 'Verificado',
    'warning': 'Verificar',
    'infected': 'Infectado',
    'unknown': 'Desconhecido'
  };
  return statusMap[status] || 'Desconhecido';
}

function getStatusClass(status) {
  return `status-${status}`;
}

function formatSiteCard(site) {
  // Parse scan details
  let scanDetails = null;
  if (site.details) {
    try {
      const scanData = JSON.parse(site.details);
      scanDetails = parseScanDetails(scanData);
    } catch (e) {
      console.error('Error parsing site details in report:', e);
    }
  }
  
  // Preparar dados de uptime
  const uptimeData = {
    status: site.uptime_status,
    ratio: site.uptime_uptime_ratio,
    responseTime: site.uptime_response_time,
    lastCheck: site.uptime_last_check
  };
  
  // Usar o template profissional
  return formatSiteCardProfessional(site, scanDetails, uptimeData);
}

function getStatusLabel(status) {
  const labels = {
    'clean': 'Verificado',
    'warning': 'Verificar',
    'infected': 'Infectado',
    'unknown': 'Desconhecido'
  };
  return labels[status] || 'Desconhecido';
}

async function sendSiteReport(site) {
  try {
    const settings = await getReportSettings();
    
    // Parse scan details
    let scanDetails = null;
    if (site.details) {
      try {
        const scanData = JSON.parse(site.details);
        scanDetails = parseScanDetails(scanData);
      } catch (e) {
        console.error('Error parsing scan details:', e);
      }
    }

    // Gerar HTML do relatório (incluindo dados de uptime e Wordfence se disponíveis)
    const sitesListHtml = formatSiteCard({
      ...site,
      domain: site.domain,
      last_status: site.last_status || 'unknown',
      last_scan: site.last_scan,
      details: site.details,
      uptime_status: site.uptime_status,
      uptime_uptime_ratio: site.uptime_uptime_ratio,
      uptime_response_time: site.uptime_response_time,
      uptime_last_check: site.uptime_last_check,
      wordfence_enabled: site.wordfence_enabled || false,
      wordfence_scan_status: site.wordfence_scan_status || null,
      wordfence_last_scan: site.wordfence_last_scan || null
    });

    // Processar emails (pode ser múltiplos separados por vírgula)
    const recipientEmails = site.client_email 
      ? site.client_email.split(',').map(e => e.trim()).filter(e => e)
      : [];

    if (recipientEmails.length === 0) {
      return {
        success: false,
        message: 'Cliente não possui email cadastrado'
      };
    }

    // Usar primeiro email para a variável {{clientEmail}} no template
    const firstEmail = recipientEmails[0];

    // Pegar apenas o primeiro nome do cliente
    const firstName = site.client_name ? site.client_name.split(' ')[0] : 'Cliente';

    // Substituir variáveis no template
    let htmlContent = settings.template
      .replace(/\{\{clientName\}\}/g, firstName)
      .replace(/\{\{clientEmail\}\}/g, firstEmail)
      .replace(/\{\{clientPhone\}\}/g, site.client_phone || '')
      .replace(/\{\{sitesList\}\}/g, sitesListHtml)
      .replace(/\{\{reportDate\}\}/g, new Date().toLocaleString('pt-BR'));

    const subject = settings.subject
      .replace(/\{\{clientName\}\}/g, firstName);

    // Enviar email para todos os destinatários
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'ArtnaWEB Monitor'}" <${process.env.SMTP_USER}>`,
      to: recipientEmails.length > 1 ? recipientEmails : recipientEmails[0], // Array se múltiplos, string se único
      subject: subject,
      html: htmlContent,
      text: htmlContent.replace(/<[^>]*>/g, '')
    });

    console.log(`[Report] Email enviado para ${recipientEmails.length} destinatário(s):`, recipientEmails.join(', '));
    console.log('[Report] MessageId:', info.messageId);
    return {
      success: true,
      messageId: info.messageId,
      recipientsCount: recipientEmails.length,
      recipients: recipientEmails
    };

  } catch (error) {
    console.error('Report email error:', error);
    
    // Mensagens de erro mais amigáveis
    let errorMessage = 'Erro ao enviar relatório';
    
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      errorMessage = 'Erro de autenticação SMTP: Credenciais de email incorretas. Verifique SMTP_USER e SMTP_PASS no arquivo .env';
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Erro de conexão SMTP: Não foi possível conectar ao servidor de email. Verifique SMTP_HOST e SMTP_PORT';
    } else if (error.message) {
      errorMessage = `Erro ao enviar relatório: ${error.message}`;
    }
    
    return {
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
  }
}

async function sendClientReport(client, sites) {
  try {
    const settings = await getReportSettings();
    
    // Gerar HTML para cada site (incluindo dados de uptime e Wordfence se disponíveis)
    // O template ocultará informações preocupantes para sites com status não limpo
    const sitesListHtml = sites.map(site => {
      return formatSiteCard({
        domain: site.domain,
        last_status: site.last_status || 'unknown',
        last_scan: site.last_scan,
        details: site.details,
        uptime_status: site.uptime_status,
        uptime_uptime_ratio: site.uptime_uptime_ratio,
        uptime_response_time: site.uptime_response_time,
        uptime_last_check: site.uptime_last_check,
        wordfence_enabled: site.wordfence_enabled || false,
        wordfence_scan_status: site.wordfence_scan_status || null,
        wordfence_last_scan: site.wordfence_last_scan || null
      });
    }).join('');

    // Processar emails (pode ser múltiplos separados por vírgula)
    const recipientEmails = client.email 
      ? client.email.split(',').map(e => e.trim()).filter(e => e)
      : [];

    if (recipientEmails.length === 0) {
      return {
        success: false,
        message: 'Cliente não possui email cadastrado'
      };
    }

    // Usar primeiro email para a variável {{clientEmail}} no template
    const firstEmail = recipientEmails[0];

    // Pegar apenas o primeiro nome do cliente
    const firstName = client.name ? client.name.split(' ')[0] : 'Cliente';

    // Substituir variáveis no template
    let htmlContent = settings.template
      .replace(/\{\{clientName\}\}/g, firstName)
      .replace(/\{\{clientEmail\}\}/g, firstEmail)
      .replace(/\{\{clientPhone\}\}/g, client.phone || '')
      .replace(/\{\{sitesList\}\}/g, sitesListHtml)
      .replace(/\{\{reportDate\}\}/g, new Date().toLocaleString('pt-BR'))
      .replace(/\{\{totalSites\}\}/g, sites.length.toString());

    const subject = settings.subject
      .replace(/\{\{clientName\}\}/g, firstName);

    // Enviar email para todos os destinatários
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'ArtnaWEB Monitor'}" <${process.env.SMTP_USER}>`,
      to: recipientEmails.length > 1 ? recipientEmails : recipientEmails[0], // Array se múltiplos, string se único
      subject: subject,
      html: htmlContent,
      text: htmlContent.replace(/<[^>]*>/g, '')
    });

    console.log(`[Report] Relatório de cliente enviado para ${recipientEmails.length} destinatário(s):`, recipientEmails.join(', '));
    console.log('[Report] MessageId:', info.messageId);
    return {
      success: true,
      messageId: info.messageId,
      sitesCount: sites.length,
      recipientsCount: recipientEmails.length,
      recipients: recipientEmails
    };

  } catch (error) {
    console.error('Client report email error:', error);
    
    // Mensagens de erro mais amigáveis
    let errorMessage = 'Erro ao enviar relatório';
    
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      errorMessage = 'Erro de autenticação SMTP: Credenciais de email incorretas. Verifique SMTP_USER e SMTP_PASS no arquivo .env';
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Erro de conexão SMTP: Não foi possível conectar ao servidor de email. Verifique SMTP_HOST e SMTP_PORT';
    } else if (error.message) {
      errorMessage = `Erro ao enviar relatório: ${error.message}`;
    }
    
    return {
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
  }
}

async function sendCustomReport({ to, subject, html, site }) {
  try {
    // Processar emails (pode ser string única ou múltiplos separados por vírgula)
    // Mas neste caso, sempre recebe um único email por chamada
    const recipientEmail = typeof to === 'string' ? to.trim() : to;

    if (!recipientEmail) {
      return {
        success: false,
        message: 'Nenhum email de destinatário fornecido'
      };
    }

    // Enviar email com conteúdo customizado
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'ArtnaWEB Monitor'}" <${process.env.SMTP_USER}>`,
      to: recipientEmail,
      subject: subject,
      html: html,
      text: html.replace(/<[^>]*>/g, '')
    });

    console.log('Custom report email sent:', info.messageId);
    return {
      success: true,
      messageId: info.messageId
    };

  } catch (error) {
    console.error('Custom report email error:', error);
    
    // Mensagens de erro mais amigáveis
    let errorMessage = 'Erro ao enviar relatório';
    
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      errorMessage = 'Erro de autenticação SMTP: Credenciais de email incorretas. Verifique SMTP_USER e SMTP_PASS no arquivo .env';
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Erro de conexão SMTP: Não foi possível conectar ao servidor de email. Verifique SMTP_HOST e SMTP_PORT';
    } else if (error.message) {
      errorMessage = `Erro ao enviar relatório: ${error.message}`;
    }
    
    return {
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
  }
}

module.exports = {
  sendSiteReport,
  sendClientReport,
  sendCustomReport,
  getReportSettings,
  formatSiteCard
};

