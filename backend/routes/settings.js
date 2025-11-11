/**
 * Settings Routes
 */

const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Todas as rotas precisam de autenticação
router.use(authenticateToken);

// Obter todas as configurações
router.get('/', async (req, res) => {
  try {
    const [settings] = await db.execute(
      'SELECT setting_key, setting_value, setting_type, description FROM settings ORDER BY setting_key'
    );

    // Converter para objeto
    const settingsObj = {};
    settings.forEach(setting => {
      let value = setting.setting_value;
      
      // Converter tipos
      if (setting.setting_type === 'boolean') {
        value = value === '1' || value === 'true';
      } else if (setting.setting_type === 'number') {
        value = parseFloat(value) || 0;
      }
      
      settingsObj[setting.setting_key] = {
        value,
        type: setting.setting_type,
        description: setting.description
      };
    });

    res.json({
      success: true,
      data: settingsObj
    });

  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar configurações'
    });
  }
});

// Atualizar configuração
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined || value === null) {
      return res.status(400).json({
        success: false,
        message: 'Valor é obrigatório'
      });
    }

    // Converter valor para string
    let stringValue = String(value);
    if (typeof value === 'boolean') {
      stringValue = value ? '1' : '0';
    }

    // Verificar se a configuração existe
    const [existing] = await db.execute(
      'SELECT setting_key FROM settings WHERE setting_key = ?',
      [key]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Configuração não encontrada'
      });
    }

    // Atualizar
    await db.execute(
      'UPDATE settings SET setting_value = ? WHERE setting_key = ?',
      [stringValue, key]
    );

    res.json({
      success: true,
      message: 'Configuração atualizada com sucesso',
      data: {
        key,
        value: stringValue
      }
    });

  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar configuração'
    });
  }
});

// Atualizar múltiplas configurações
router.put('/', async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Configurações são obrigatórias'
      });
    }

    const updates = [];
    console.log('[Settings] Atualizando configurações:', Object.keys(settings));
    
    for (const [key, value] of Object.entries(settings)) {
      let stringValue = String(value);
      if (typeof value === 'boolean') {
        stringValue = value ? '1' : '0';
      }
      
      // Log detalhado para configurações de scan
      if (['scan_interval_enabled', 'scan_interval_value', 'scan_interval_unit'].includes(key)) {
        console.log(`[Settings] Salvando ${key}:`);
        console.log(`  - Valor recebido: ${value} (tipo: ${typeof value})`);
        console.log(`  - Valor que será salvo: "${stringValue}"`);
      }

      await db.execute(
        'UPDATE settings SET setting_value = ? WHERE setting_key = ?',
        [stringValue, key]
      );
      
      // Verificar se foi salvo corretamente
      const [verify] = await db.execute(
        'SELECT setting_value FROM settings WHERE setting_key = ?',
        [key]
      );
      
      if (verify.length > 0) {
        console.log(`[Settings] ${key} salvo no banco: "${verify[0].setting_value}"`);
      }
      
      updates.push({ key, value: stringValue });
    }

    // Reiniciar scan automático se as configurações de scan foram alteradas
    const scanSettings = ['scan_interval_enabled'];
    const scanSettingsChanged = Object.keys(settings).some(key => scanSettings.includes(key));
    
    if (scanSettingsChanged) {
      console.log('[Settings] ========================================');
      console.log('[Settings] Configurações de scan alteradas!');
      console.log('[Settings] Valores salvos:');
      updates.filter(u => scanSettings.includes(u.key)).forEach(u => {
        console.log(`  - ${u.key}: "${u.value}"`);
      });
      console.log('[Settings] Reiniciando serviço de scan automático...');
      console.log('[Settings] ========================================');
      
      try {
        const autoScanService = require('../services/autoScanService');
        await autoScanService.restartAutoScan();
        console.log('[Settings] Serviço de scan automático reiniciado com sucesso');
      } catch (error) {
        console.error('[Settings] Erro ao reiniciar scan automático:', error);
        console.error('[Settings] Stack:', error.stack);
      }
    }

    // Reiniciar sincronização de uptime se configurações do UptimeRobot foram alteradas
    const uptimeSettings = ['uptimerobot_enabled', 'uptimerobot_api_key'];
    const uptimeSettingsChanged = Object.keys(settings).some(key => uptimeSettings.includes(key));
    
    if (uptimeSettingsChanged) {
      console.log('[Settings] ========================================');
      console.log('[Settings] Configurações do UptimeRobot alteradas!');
      console.log('[Settings] Reiniciando serviço de sincronização de uptime...');
      console.log('[Settings] ========================================');
      
      try {
        const uptimeSyncService = require('../services/uptimeSyncService');
        await uptimeSyncService.restartUptimeSync();
        console.log('[Settings] Serviço de sincronização de uptime reiniciado com sucesso');
      } catch (error) {
        console.error('[Settings] Erro ao reiniciar sincronização de uptime:', error);
        console.error('[Settings] Stack:', error.stack);
      }
    }

    res.json({
      success: true,
      message: 'Configurações atualizadas com sucesso',
      data: updates
    });

  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar configurações'
    });
  }
});

// Obter template padrão de relatório
router.get('/default-report-template', async (req, res) => {
  try {
    const { getProfessionalReportTemplate } = require('../services/reportTemplate');
    const defaultTemplate = getProfessionalReportTemplate();
    
    res.json({
      success: true,
      data: {
        template: defaultTemplate
      }
    });
  } catch (error) {
    console.error('Get default report template error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar template padrão'
    });
  }
});

module.exports = router;

