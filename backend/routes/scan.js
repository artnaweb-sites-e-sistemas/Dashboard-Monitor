/**
 * Scan Routes
 */

const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { scanSite, determineStatus } = require('../services/sucuriService');
const { checkWordfenceScan, determineWordfenceStatus, combineStatus } = require('../services/wordfenceService');
const emailService = require('../services/emailService');

const router = express.Router();

// Todas as rotas precisam de autenticação
router.use(authenticateToken);

// Escanear site específico
router.post('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar site (incluindo configuração Wordfence)
    const [sites] = await db.execute(
      `SELECT id, domain, last_status, alert_sent, last_scan, 
              wordfence_enabled, wordfence_api_key 
       FROM sites 
       WHERE id = ?`,
      [id]
    );

    if (sites.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Site não encontrado'
      });
    }

    const site = sites[0];

    console.log(`[Scan] Iniciando scan do site: ${site.domain}`);
    console.log(`[Scan] Wordfence habilitado: ${site.wordfence_enabled} (tipo: ${typeof site.wordfence_enabled})`);
    console.log(`[Scan] Wordfence API key: ${site.wordfence_api_key ? site.wordfence_api_key.substring(0, 10) + '...' : 'NÃO CONFIGURADA'}`);
    
    // Escanear via API Sucuri
    const scanResult = await scanSite(site.domain);

    if (!scanResult.success) {
      console.error(`Erro ao escanear ${site.domain}:`, scanResult.message);
      return res.status(500).json({
        success: false,
        message: `Erro ao escanear site: ${scanResult.message}`
      });
    }
    
    console.log(`Scan concluído para ${site.domain}`);

    // Determinar status Sucuri (externo)
    const sucuriStatus = determineStatus(scanResult.data);
    const details = JSON.stringify(scanResult.data, null, 2);
    const now = new Date();
    
    console.log(`Status Sucuri detectado para ${site.domain}: ${sucuriStatus}`);

    // Scan Wordfence (interno) - apenas se habilitado e tiver API key
    let wordfenceStatus = null;
    let wordfenceDetails = null;
    let finalStatus = sucuriStatus;

    // Verificar se Wordfence está habilitado (pode ser 1/0 do MySQL ou true/false)
    const isWordfenceEnabled = site.wordfence_enabled === 1 || site.wordfence_enabled === true || site.wordfence_enabled === '1';
    const hasApiKey = site.wordfence_api_key && site.wordfence_api_key.trim() !== '';

    console.log(`[Scan] Verificando Wordfence - Habilitado: ${isWordfenceEnabled}, API Key presente: ${hasApiKey}`);

    if (isWordfenceEnabled && hasApiKey) {
      try {
        console.log(`[Scan] Executando scan Wordfence para ${site.domain}...`);
        const wordfenceResult = await checkWordfenceScan(site.domain, site.wordfence_api_key);
        
        if (wordfenceResult.success && wordfenceResult.data) {
          wordfenceStatus = determineWordfenceStatus(wordfenceResult);
          
          // Preparar dados do Wordfence no formato esperado pela página de detalhes
          const wordfenceData = wordfenceResult.data;
          const detailsToSave = {
            scan_status: wordfenceData.scan_status || wordfenceStatus,
            malware_detected: wordfenceData.malware_detected || false,
            infected_files: wordfenceData.infected_files || [],
            last_scan: wordfenceData.last_scan || now.toISOString(),
            total_files_scanned: wordfenceData.scan_details?.total_files_scanned || wordfenceData.total_files_scanned || 0,
            infected_files_count: wordfenceData.scan_details?.infected_files_count || wordfenceData.infected_files_count || (wordfenceData.infected_files ? wordfenceData.infected_files.length : 0),
            warnings_count: wordfenceData.scan_details?.warnings_count || wordfenceData.warnings_count || 0,
            critical_count: wordfenceData.scan_details?.critical_count || wordfenceData.critical_count || 0,
            medium_count: wordfenceData.scan_details?.medium_count || wordfenceData.medium_count || 0,
            issues: wordfenceData.scan_details?.issues || wordfenceData.issues || []
          };
          
          wordfenceDetails = JSON.stringify(detailsToSave, null, 2);
          
          // Combinar status: Sucuri (externo) + Wordfence (interno)
          finalStatus = combineStatus(sucuriStatus, wordfenceStatus);
          
          console.log(`[Scan] Wordfence scan concluído para ${site.domain}: ${wordfenceStatus}`);
          console.log(`[Scan] Status final combinado para ${site.domain}: ${finalStatus}`);
          console.log(`[Scan] Dados Wordfence salvos:`, JSON.stringify(detailsToSave, null, 2));
        } else {
          console.warn(`[Scan] Wordfence scan não disponível para ${site.domain}: ${wordfenceResult.message || 'API não retornou dados'}`);
        }
      } catch (wordfenceError) {
        console.error(`[Scan] Erro no scan Wordfence para ${site.domain}:`, wordfenceError.message);
        console.error(`[Scan] Stack trace:`, wordfenceError.stack);
        // Continua com o status do Sucuri mesmo se Wordfence falhar
      }
    } else {
      console.log(`[Scan] Wordfence não será executado para ${site.domain}:`);
      console.log(`[Scan] - wordfence_enabled: ${site.wordfence_enabled} (verificado como: ${isWordfenceEnabled})`);
      console.log(`[Scan] - wordfence_api_key: ${hasApiKey ? 'presente' : 'ausente'}`);
    }

    // Atualizar banco de dados
    console.log(`[Scan] Atualizando banco de dados para site ${id}:`);
    console.log(`[Scan] - last_status: ${finalStatus}`);
    console.log(`[Scan] - wordfence_last_scan: ${wordfenceStatus ? now : 'null'}`);
    console.log(`[Scan] - wordfence_scan_status: ${wordfenceStatus || 'null'}`);
    console.log(`[Scan] - wordfence_scan_details: ${wordfenceDetails ? 'presente' : 'null'}`);

    await db.execute(
      `UPDATE sites 
       SET last_status = ?, 
           last_scan = ?, 
           details = ?,
           wordfence_last_scan = ?,
           wordfence_scan_status = ?,
           wordfence_scan_details = ?
       WHERE id = ?`,
      [
        finalStatus, 
        now, 
        details,
        wordfenceStatus ? now : null,
        wordfenceStatus,
        wordfenceDetails,
        id
      ]
    );

    console.log(`[Scan] ✅ Banco de dados atualizado com sucesso para site ${id}`);

    // Salvar no histórico
    await db.execute(
      `INSERT INTO scan_history (site_id, status, scan_date, details) 
       VALUES (?, ?, ?, ?)`,
      [id, finalStatus, now, details]
    );

    // Enviar e-mail de alerta apenas se malware detectado (status infected)
    if (finalStatus === 'infected' && site.alert_sent === 0) {
      try {
        await emailService.sendAlertEmail(site.domain, status, scanResult.data);
        await db.execute(
          'UPDATE sites SET alert_sent = 1 WHERE id = ?',
          [id]
        );
        console.log(`[Scan] Alerta de malware enviado para ${site.domain}`);
      } catch (emailError) {
        console.error('Email error:', emailError);
        // Não falhar o scan se o e-mail falhar
      }
    }

    // Resetar alert_sent se status voltou para clean
    if (finalStatus === 'clean' && site.alert_sent === 1) {
      await db.execute(
        'UPDATE sites SET alert_sent = 0 WHERE id = ?',
        [id]
      );
    }

    res.json({
      success: true,
      message: 'Site escaneado com sucesso',
      data: {
        id: parseInt(id),
        status: finalStatus,
        sucuriStatus: sucuriStatus,
        wordfenceStatus: wordfenceStatus,
        last_scan: now
      }
    });

  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao escanear site'
    });
  }
});

// Escanear todos os sites
router.post('/all', async (req, res) => {
  try {
    const [sites] = await db.execute('SELECT id FROM sites ORDER BY id');

    let scanned = 0;
    let errors = 0;

    for (const site of sites) {
      try {
        // Buscar site completo
        const [siteData] = await db.execute(
          'SELECT * FROM sites WHERE id = ?',
          [site.id]
        );

        if (siteData.length === 0) continue;

        const siteObj = siteData[0];

        // Escanear
        const scanResult = await scanSite(siteObj.domain);

        if (scanResult.success) {
          const status = determineStatus(scanResult.data);
          const details = JSON.stringify(scanResult.data, null, 2);
          const now = new Date();

          // Atualizar
          await db.execute(
            `UPDATE sites 
             SET last_status = ?, last_scan = ?, details = ? 
             WHERE id = ?`,
            [status, now, details, site.id]
          );

          // Histórico
          await db.execute(
            `INSERT INTO scan_history (site_id, status, scan_date, details) 
             VALUES (?, ?, ?, ?)`,
            [site.id, status, now, details]
          );

          scanned++;
        } else {
          errors++;
        }

        // Delay para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error scanning site ${site.id}:`, error);
        errors++;
      }
    }

    res.json({
      success: errors === 0,
      message: `Varredura concluída! ${scanned} site(s) escaneado(s) com sucesso.${errors > 0 ? ` ${errors} erro(s) encontrado(s).` : ''}`,
      scanned,
      errors
    });

  } catch (error) {
    console.error('Scan all error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao escanear sites'
    });
  }
});

module.exports = router;

