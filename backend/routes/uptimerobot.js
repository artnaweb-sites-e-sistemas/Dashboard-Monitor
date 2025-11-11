/**
 * UptimeRobot Routes
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const uptimerobotService = require('../services/uptimerobotService');

const router = express.Router();

// Todas as rotas precisam de autenticação
router.use(authenticateToken);

// Sincronizar dados de uptime
router.post('/sync', async (req, res) => {
  try {
    console.log('[UptimeRobot Route] ========================================');
    console.log('[UptimeRobot Route] 🔄 Requisição de sincronização recebida');
    console.log('[UptimeRobot Route] Timestamp:', new Date().toISOString());
    console.log('[UptimeRobot Route] IP:', req.ip);
    console.log('[UptimeRobot Route] ========================================');
    
    const result = await uptimerobotService.syncUptimeData();
    
    console.log('[UptimeRobot Route] Resultado da sincronização:', {
      success: result.success,
      updated: result.updated,
      totalMonitors: result.totalMonitors
    });
    
    res.json(result);
  } catch (error) {
    console.error('[UptimeRobot Route] ❌ ERRO na sincronização:', error);
    console.error('[UptimeRobot Route] Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Erro ao sincronizar dados do UptimeRobot',
      error: error.message
    });
  }
});

// Criar monitor para um site
router.post('/monitor/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    const db = require('../config/database');
    
    // Buscar site
    const [sites] = await db.execute('SELECT id, domain FROM sites WHERE id = ?', [siteId]);
    
    if (sites.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Site não encontrado'
      });
    }

    const site = sites[0];
    const result = await uptimerobotService.createMonitorForSite(site.id, site.domain);
    
    res.json(result);
  } catch (error) {
    console.error('UptimeRobot create monitor error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar monitor no UptimeRobot',
      error: error.message
    });
  }
});

// Remover monitor de um site
router.delete('/monitor/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    const result = await uptimerobotService.deleteMonitorForSite(siteId);
    res.json(result);
  } catch (error) {
    console.error('UptimeRobot delete monitor error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao remover monitor do UptimeRobot',
      error: error.message
    });
  }
});

// Listar monitores do UptimeRobot
router.get('/monitors', async (req, res) => {
  try {
    const result = await uptimerobotService.getMonitors();
    res.json(result);
  } catch (error) {
    console.error('UptimeRobot get monitors error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar monitores do UptimeRobot',
      error: error.message
    });
  }
});

// Sincronizar um site específico
router.post('/sync-site/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    const db = require('../config/database');
    
    // Buscar site
    const [sites] = await db.execute(
      'SELECT id, uptimerobot_monitor_id FROM sites WHERE id = ?',
      [siteId]
    );
    
    if (sites.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Site não encontrado'
      });
    }

    const site = sites[0];
    
    if (!site.uptimerobot_monitor_id) {
      return res.status(400).json({
        success: false,
        message: 'Site não possui monitor no UptimeRobot'
      });
    }

    // Buscar dados do monitor específico
    const monitorStats = await uptimerobotService.getMonitorStats(site.uptimerobot_monitor_id);
    
    if (monitorStats.success && monitorStats.data?.monitors && monitorStats.data.monitors.length > 0) {
      const monitor = monitorStats.data.monitors[0];
      await uptimerobotService.updateSiteUptimeData(siteId, monitor);
      
      res.json({
        success: true,
        message: 'Site sincronizado com sucesso'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar dados do monitor',
        error: monitorStats.message
      });
    }
  } catch (error) {
    console.error('UptimeRobot sync site error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao sincronizar site',
      error: error.message
    });
  }
});

// Verificar status da integração
router.get('/status', async (req, res) => {
  try {
    const enabled = await uptimerobotService.isEnabled();
    const apiKey = await uptimerobotService.getApiKey();
    
    res.json({
      success: true,
      enabled,
      apiKeyConfigured: !!apiKey
    });
  } catch (error) {
    console.error('UptimeRobot status error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar status',
      error: error.message
    });
  }
});

module.exports = router;

