/**
 * Sites Routes
 */

const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Todas as rotas precisam de autenticação
router.use(authenticateToken);

// Listar sites
router.get('/', async (req, res) => {
  try {
    console.log('[Sites Route] GET /api/sites - Requisição recebida');
    console.log('[Sites Route] User:', req.user?.username || 'N/A');
    
    console.log('[Sites Route] Executando query no banco de dados...');
    const [sites] = await db.execute(
      `SELECT s.*, 
              c.id as client_id, c.name as client_name, c.email as client_email, c.phone as client_phone,
              (SELECT MAX(report_date) FROM report_history rh WHERE rh.site_id = s.id AND rh.status = 'sent') as last_report_date
       FROM sites s
       LEFT JOIN clients c ON s.client_id = c.id
       ORDER BY s.domain ASC`
    );

    console.log(`[Sites Route] ${sites.length} site(s) encontrado(s) no banco`);

    // Formatar dados
    const formattedSites = sites.map(site => ({
      id: site.id,
      domain: site.domain,
      last_status: site.last_status,
      last_scan: site.last_scan,
      details: site.details,
      alert_sent: site.alert_sent,
      created_at: site.created_at,
      updated_at: site.updated_at,
      uptimerobot_monitor_id: site.uptimerobot_monitor_id,
      uptime_status: site.uptime_status,
      uptime_last_check: site.uptime_last_check,
      uptime_uptime_ratio: site.uptime_uptime_ratio,
      uptime_response_time: site.uptime_response_time,
      wordfence_enabled: site.wordfence_enabled || false,
      wordfence_api_key: site.wordfence_api_key || null,
      wordfence_last_scan: site.wordfence_last_scan || null,
      wordfence_scan_status: site.wordfence_scan_status || null,
      wordfence_scan_details: site.wordfence_scan_details || null,
      last_report_date: site.last_report_date,
      client: site.client_id ? {
        id: site.client_id,
        name: site.client_name,
        email: site.client_email,
        phone: site.client_phone
      } : null
    }));

    console.log(`[Sites Route] ✅ Retornando ${formattedSites.length} site(s) formatado(s)`);

    res.json({
      success: true,
      data: formattedSites
    });

  } catch (error) {
    console.error('[Sites Route] ❌ ERRO ao listar sites:');
    console.error('[Sites Route] Mensagem:', error.message);
    console.error('[Sites Route] Stack:', error.stack);
    console.error('[Sites Route] Código SQL:', error.code);
    console.error('[Sites Route] SQL State:', error.sqlState);
    console.error('[Sites Route] SQL Message:', error.sqlMessage);
    
    res.status(500).json({
      success: false,
      message: 'Erro ao listar sites: ' + error.message,
      error: error.message,
      code: error.code
    });
  }
});

// Obter detalhes do scan de um site (deve vir antes de /:id)
router.get('/:id/details', async (req, res) => {
  try {
    const { id } = req.params;

    const [sites] = await db.execute(
      'SELECT * FROM sites WHERE id = ?',
      [id]
    );

    if (sites.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Site não encontrado'
      });
    }

    const site = sites[0];
    
    if (!site.details) {
      return res.json({
        success: true,
        data: {
          categories: [],
          overallStatus: 'unknown',
          summary: 'Nenhum scan foi realizado ainda para este site.'
        }
      });
    }

    // Parse details
    const parseScanDetails = require('../services/scanDetailsParser').parseScanDetails;
    let scanData;
    
    try {
      scanData = JSON.parse(site.details);
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao processar dados do scan'
      });
    }

    const parsedDetails = parseScanDetails(scanData);

    res.json({
      success: true,
      data: parsedDetails
    });

  } catch (error) {
    console.error('Get site details error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar detalhes do site'
    });
  }
});

// Obter site por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar site com dados do cliente
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

    // Formatar dados
    const formattedSite = {
      id: site.id,
      domain: site.domain,
      last_status: site.last_status,
      last_scan: site.last_scan,
      details: site.details,
      alert_sent: site.alert_sent,
      created_at: site.created_at,
      updated_at: site.updated_at,
      uptimerobot_monitor_id: site.uptimerobot_monitor_id,
      uptime_status: site.uptime_status,
      uptime_last_check: site.uptime_last_check,
      uptime_uptime_ratio: site.uptime_uptime_ratio,
      uptime_response_time: site.uptime_response_time,
      wordfence_enabled: site.wordfence_enabled || false,
      wordfence_api_key: site.wordfence_api_key || null,
      wordfence_last_scan: site.wordfence_last_scan || null,
      wordfence_scan_status: site.wordfence_scan_status || null,
      wordfence_scan_details: site.wordfence_scan_details || null,
      client: site.client_id ? {
        id: site.client_id,
        name: site.client_name,
        email: site.client_email,
        phone: site.client_phone
      } : null
    };

    res.json({
      success: true,
      data: formattedSite
    });

  } catch (error) {
    console.error('Get site error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar site'
    });
  }
});

// Adicionar site
router.post('/', async (req, res) => {
  try {
    const { domain, client_id } = req.body;

    if (!domain) {
      return res.status(400).json({
        success: false,
        message: 'Domínio é obrigatório'
      });
    }

    // Validar URL
    let url = domain.trim();
    if (!url.match(/^https?:\/\//)) {
      url = 'https://' + url;
    }

    try {
      new URL(url); // Validar URL
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'URL inválida'
      });
    }

    // Se client_id foi fornecido, verificar se existe
    if (client_id) {
      const [client] = await db.execute(
        'SELECT id FROM clients WHERE id = ?',
        [client_id]
      );
      if (client.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cliente não encontrado'
        });
      }
    }

    // Verificar se já existe
    const [existing] = await db.execute(
      'SELECT id FROM sites WHERE domain = ?',
      [url]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Este site já está cadastrado'
      });
    }

    // Inserir
    const [result] = await db.execute(
      'INSERT INTO sites (domain, client_id, last_status, alert_sent) VALUES (?, ?, ?, ?)',
      [url, client_id || null, 'unknown', 0]
    );

    res.status(201).json({
      success: true,
      message: 'Site adicionado com sucesso',
      data: {
        id: result.insertId,
        domain: url,
        client_id: client_id || null
      }
    });

  } catch (error) {
    console.error('Add site error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao adicionar site'
    });
  }
});

// Atualizar configuração Wordfence de um site
router.put('/:id/wordfence', async (req, res) => {
  try {
    const { id } = req.params;
    const { wordfence_enabled, wordfence_api_key } = req.body;

    // Verificar se o site existe
    const [sites] = await db.execute(
      'SELECT id FROM sites WHERE id = ?',
      [id]
    );

    if (sites.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Site não encontrado'
      });
    }

    // Atualizar configuração Wordfence
    await db.execute(
      `UPDATE sites 
       SET wordfence_enabled = ?, 
           wordfence_api_key = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [
        wordfence_enabled ? 1 : 0,
        wordfence_api_key || null,
        id
      ]
    );

    res.json({
      success: true,
      message: 'Configuração Wordfence atualizada com sucesso'
    });

  } catch (error) {
    console.error('Update Wordfence config error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar configuração Wordfence'
    });
  }
});

// Remover site
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar site para verificar se tem monitor no UptimeRobot
    const [sites] = await db.execute(
      'SELECT id, domain, uptimerobot_monitor_id FROM sites WHERE id = ?',
      [id]
    );

    if (sites.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Site não encontrado'
      });
    }

    const site = sites[0];

    // Se o site tem monitor no UptimeRobot, removê-lo primeiro
    if (site.uptimerobot_monitor_id) {
      try {
        console.log(`[Sites Route] Removendo monitor ${site.uptimerobot_monitor_id} do UptimeRobot para site ${id}...`);
        const uptimerobotService = require('../services/uptimerobotService');
        const deleteResult = await uptimerobotService.deleteMonitorForSite(id);
        
        if (deleteResult.success) {
          console.log(`[Sites Route] Monitor ${site.uptimerobot_monitor_id} removido do UptimeRobot com sucesso`);
        } else {
          console.warn(`[Sites Route] Aviso: Não foi possível remover monitor do UptimeRobot: ${deleteResult.message}`);
          // Continua removendo o site mesmo se falhar ao remover o monitor
        }
      } catch (error) {
        console.error(`[Sites Route] Erro ao remover monitor do UptimeRobot:`, error);
        // Continua removendo o site mesmo se falhar ao remover o monitor
      }
    }

    // Remover o site do banco de dados
    const [result] = await db.execute(
      'DELETE FROM sites WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Site não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Site removido com sucesso'
    });

  } catch (error) {
    console.error('Delete site error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao remover site'
    });
  }
});

module.exports = router;

