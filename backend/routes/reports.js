/**
 * Reports Routes
 */

const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const reportService = require('../services/reportService');

const router = express.Router();

// Todas as rotas precisam de autenticação
router.use(authenticateToken);

// Enviar relatório para um site específico
router.post('/site/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, subject, body } = req.body; // Aceitar email, subject e body customizados

    // Buscar site com cliente
    const [sites] = await db.execute(
      `SELECT s.*, c.id as client_id, c.name as client_name, c.email as client_email, c.phone as client_phone
       FROM sites s
       LEFT JOIN clients c ON s.client_id = c.id
       WHERE s.id = ?`,
      [id]
    );

    if (sites.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Site não encontrado'
      });
    }

    const site = sites[0];

    // Se email customizado foi fornecido, usar ele; senão usar o email do cliente
    const recipientEmail = email || site.client_email;

    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email do destinatário não fornecido e cliente não possui email cadastrado'
      });
    }

    // Se subject e body customizados foram fornecidos, usar eles; senão gerar normalmente
    if (subject && body) {
      // Enviar relatório com conteúdo customizado
      const result = await reportService.sendCustomReport({
        to: recipientEmail,
        subject: subject,
        html: body,
        site: site
      });

      if (result.success) {
        // Registrar no histórico
        await db.execute(
          'INSERT INTO report_history (client_id, site_id, report_type, email_sent, status) VALUES (?, ?, ?, ?, ?)',
          [site.client_id, site.id, 'manual', recipientEmail, 'sent']
        );

        res.json({
          success: true,
          message: 'Relatório enviado com sucesso',
          data: result
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.message || 'Erro ao enviar relatório'
        });
      }
    } else {
      // Gerar e enviar relatório usando template padrão
      const result = await reportService.sendSiteReport(site);

      if (result.success) {
        // Registrar no histórico
        await db.execute(
          'INSERT INTO report_history (client_id, site_id, report_type, email_sent, status) VALUES (?, ?, ?, ?, ?)',
          [site.client_id, site.id, 'manual', recipientEmail, 'sent']
        );

        res.json({
          success: true,
          message: 'Relatório enviado com sucesso',
          data: result
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.message || 'Erro ao enviar relatório'
        });
      }
    }

  } catch (error) {
    console.error('Send report error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao enviar relatório'
    });
  }
});

// Enviar relatório para todos os sites de um cliente
router.post('/client/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar cliente
    const [clients] = await db.execute(
      'SELECT * FROM clients WHERE id = ?',
      [id]
    );

    if (clients.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado'
      });
    }

    const client = clients[0];

    if (!client.email) {
      return res.status(400).json({
        success: false,
        message: 'Cliente não possui email cadastrado'
      });
    }

    // Buscar sites do cliente
    const [sites] = await db.execute(
      'SELECT * FROM sites WHERE client_id = ? ORDER BY domain ASC',
      [id]
    );

    if (sites.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cliente não possui sites cadastrados'
      });
    }

    // Gerar e enviar relatório consolidado
    const result = await reportService.sendClientReport(client, sites);

    if (result.success) {
      // Registrar no histórico para cada site
      for (const site of sites) {
        await db.execute(
          'INSERT INTO report_history (client_id, site_id, report_type, email_sent, status) VALUES (?, ?, ?, ?, ?)',
          [client.id, site.id, 'manual', client.email, 'sent']
        );
      }

      res.json({
        success: true,
        message: `Relatório enviado com sucesso para ${sites.length} site(s)`,
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message || 'Erro ao enviar relatório'
      });
    }

  } catch (error) {
    console.error('Send client report error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao enviar relatório'
    });
  }
});

// Gerar preview do siteCard formatado para um site
router.get('/preview/site/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar site com cliente
    const [sites] = await db.execute(
      `SELECT s.*, c.id as client_id, c.name as client_name, c.email as client_email, c.phone as client_phone
       FROM sites s
       LEFT JOIN clients c ON s.client_id = c.id
       WHERE s.id = ?`,
      [id]
    );

    if (sites.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Site não encontrado'
      });
    }

    const site = sites[0];

    // Usar o reportService para gerar o siteCard formatado
    // O template ocultará informações preocupantes para sites com status não limpo
    const { formatSiteCard } = require('../services/reportService');
    
    const siteCardHtml = formatSiteCard({
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

    res.json({
      success: true,
      data: {
        siteCardHtml
      }
    });

  } catch (error) {
    console.error('Generate site card preview error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar preview do site card'
    });
  }
});

module.exports = router;


