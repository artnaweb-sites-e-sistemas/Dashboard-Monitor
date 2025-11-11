/**
 * Auto Scan Service
 * Serviço para escanear sites automaticamente baseado nas configurações
 */

const cron = require('node-cron');
const db = require('../config/database');
const { scanSite, determineStatus } = require('./sucuriService');
const { checkWordfenceScan, determineWordfenceStatus, combineStatus } = require('./wordfenceService');
const emailService = require('./emailService');

let scanTask = null;
let currentCronExpression = null; // Armazenar expressão cron atual para debug

/**
 * Obter configurações de scan
 * Intervalo fixo: 5 minutos (configuração simplificada)
 */
async function getScanSettings() {
  try {
    // Verificar se a tabela settings existe
    try {
      await db.execute('SELECT 1 FROM settings LIMIT 1');
    } catch (tableError) {
      console.error('[Auto Scan] Tabela settings não existe! Execute init-settings.bat ou importe db.sql');
    return {
      enabled: false,
      value: 6,
      unit: 'hours',
      maxConcurrent: 3, // Fixo: 3 scans simultâneos
      error: 'Tabela settings não encontrada'
      };
    }

    // Buscar apenas se scan está habilitado
    const [settings] = await db.execute(
      `SELECT setting_key, setting_value FROM settings 
       WHERE setting_key IN ('scan_interval_enabled')`
    );

    const config = {
      enabled: false,
      value: 6, // Fixo: 6 horas
      unit: 'hours', // Fixo: horas
      maxConcurrent: 3 // Fixo: 3 scans simultâneos (valor seguro para evitar rate limiting)
    };

    settings.forEach(setting => {
      const key = setting.setting_key;
      const rawValue = setting.setting_value;

      if (key === 'scan_interval_enabled') {
        config.enabled = rawValue === '1' || rawValue === 'true' || rawValue === true || rawValue === 1;
      }
    });

    console.log('[Auto Scan] Configuração:');
    console.log(`  - enabled: ${config.enabled}`);
    console.log(`  - intervalo: ${config.value} ${config.unit} (FIXO - 6 horas)`);
    console.log(`  - maxConcurrent: ${config.maxConcurrent} (FIXO - 3 scans simultâneos)`);

    return config;
  } catch (error) {
    console.error('[Auto Scan] Error getting scan settings:', error);
    console.error('[Auto Scan] Stack:', error.stack);
    return {
      enabled: false,
      value: 6,
      unit: 'hours',
      maxConcurrent: 3, // Fixo: 3 scans simultâneos
      error: error.message
    };
  }
}

/**
 * Converter intervalo para formato cron
 * Intervalo fixo: 6 horas (configurável via variável)
 */
function getCronExpression(value, unit) {
  // Intervalo fixo: 6 horas (para reduzir carga na API Sucuri)
  // Para voltar a 5 minutos, mude para: return `*/5 * * * *`;
  return `0 */6 * * *`; // A cada 6 horas (no início de cada hora: 00:00, 06:00, 12:00, 18:00)
}

/**
 * Escanear um site
 */
async function scanSiteItem(site) {
  try {
    console.log(`[Auto Scan] Escaneando: ${site.domain}`);
    
    // Scan Sucuri (externo)
    const scanResult = await scanSite(site.domain);

    if (!scanResult.success) {
      console.error(`[Auto Scan] Erro ao escanear ${site.domain}:`, scanResult.message);
      return;
    }

    const sucuriStatus = determineStatus(scanResult.data);
    const details = JSON.stringify(scanResult.data, null, 2);
    const now = new Date();

    // Scan Wordfence (interno) - apenas se habilitado e tiver API key
    let wordfenceStatus = null;
    let wordfenceDetails = null;
    let finalStatus = sucuriStatus;

    if (site.wordfence_enabled && site.wordfence_api_key) {
      try {
        console.log(`[Auto Scan] Executando scan Wordfence para ${site.domain}...`);
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
          
          console.log(`[Auto Scan] Wordfence scan concluído para ${site.domain}: ${wordfenceStatus}`);
          console.log(`[Auto Scan] Dados Wordfence salvos:`, JSON.stringify(detailsToSave, null, 2));
        } else {
          console.warn(`[Auto Scan] Wordfence scan não disponível para ${site.domain}: ${wordfenceResult.message || 'API não retornou dados'}`);
        }
      } catch (wordfenceError) {
        console.error(`[Auto Scan] Erro no scan Wordfence para ${site.domain}:`, wordfenceError.message);
        // Continua com o status do Sucuri mesmo se Wordfence falhar
      }
    }

    // Atualizar banco de dados
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
        site.id
      ]
    );

    // Salvar no histórico
    await db.execute(
      `INSERT INTO scan_history (site_id, status, scan_date, details) 
       VALUES (?, ?, ?, ?)`,
      [site.id, status, now, details]
    );

    // Enviar e-mail de alerta apenas se malware detectado (status infected)
    if (status === 'infected' && site.alert_sent === 0) {
      try {
        await emailService.sendAlertEmail(site.domain, status, scanResult.data);
        await db.execute(
          'UPDATE sites SET alert_sent = 1 WHERE id = ?',
          [site.id]
        );
        console.log(`[Auto Scan] Alerta de malware enviado para ${site.domain}`);
      } catch (emailError) {
        console.error('[Auto Scan] Email error:', emailError);
        // Não falhar o scan se o e-mail falhar
      }
    }

    // Resetar alert_sent se status voltou para clean
    if (status === 'clean' && site.alert_sent === 1) {
      await db.execute(
        'UPDATE sites SET alert_sent = 0 WHERE id = ?',
        [site.id]
      );
    }

    console.log(`[Auto Scan] Concluído: ${site.domain} - Status: ${finalStatus} (Sucuri: ${sucuriStatus}${wordfenceStatus ? `, Wordfence: ${wordfenceStatus}` : ''})`);
  } catch (error) {
    console.error(`[Auto Scan] Erro ao processar ${site.domain}:`, error);
  }
}

/**
 * Executar scan automático de todos os sites
 */
async function runAutoScan() {
  const startTime = new Date();
  try {
    console.log(`[Auto Scan] ========================================`);
    console.log(`[Auto Scan] INICIANDO SCAN AUTOMÁTICO`);
    console.log(`[Auto Scan] Data/Hora: ${startTime.toLocaleString('pt-BR')}`);
    console.log(`[Auto Scan] ========================================`);
    console.log('');
    
    const config = await getScanSettings();
    
    if (!config.enabled) {
      console.log('[Auto Scan] Scan automático desabilitado nas configurações');
      console.log('[Auto Scan] Para habilitar, vá em Configurações e ative o scan automático');
      return;
    }
    
    // Buscar todos os sites (incluindo configuração Wordfence)
    const [sites] = await db.execute(
      `SELECT id, domain, last_status, alert_sent, last_scan, 
              wordfence_enabled, wordfence_api_key 
       FROM sites 
       ORDER BY id`
    );
    
    if (sites.length === 0) {
      console.log('[Auto Scan] Nenhum site cadastrado para escanear');
      return;
    }

    console.log(`[Auto Scan] ${sites.length} site(s) encontrado(s) para escanear`);
    console.log(`[Auto Scan] Configuração: 3 scan(s) simultâneo(s) (FIXO - valor seguro)`);
    console.log(`[Auto Scan] Intervalo configurado: 6 horas (FIXO)`);
    console.log('');
    
    // Verificar último scan de cada site para diagnóstico
    console.log('[Auto Scan] Última varredura por site:');
    let minIntervalHours = Infinity;
    sites.forEach(site => {
      if (site.last_scan) {
        const lastScan = new Date(site.last_scan);
        const diffMs = startTime - lastScan;
        const diffMinutes = Math.round(diffMs / (1000 * 60));
        const diffHours = diffMs / (1000 * 60 * 60);
        minIntervalHours = Math.min(minIntervalHours, diffHours);
        console.log(`  - ${site.domain}: ${diffMinutes} minutos atrás (${diffHours.toFixed(2)} horas)`);
      } else {
        console.log(`  - ${site.domain}: Nenhuma varredura anterior`);
      }
    });
    console.log('');
    
    // PROTEÇÃO: Não escanear se último scan foi há menos de 5 horas
    // Isso evita scans frequentes quando o backend reinicia ou há múltiplas instâncias
    if (minIntervalHours < 5 && minIntervalHours !== Infinity) {
      console.log(`[Auto Scan] ATENCAO: Ultimo scan foi ha ${minIntervalHours.toFixed(2)} horas`);
      console.log(`[Auto Scan] Por segurança, não executando scan automático (mínimo: 5 horas entre scans)`);
      console.log(`[Auto Scan] Este scan será ignorado para evitar sobrecarga na API Sucuri`);
      console.log(`[Auto Scan] Próximo scan será executado quando o cron agendar (a cada 6 horas)`);
      console.log(`[Auto Scan] Se você acabou de reiniciar o backend, aguarde a próxima execução agendada.`);
      console.log('');
      return;
    }

    // Escanear sites em lotes (concorrência limitada)
    // Valor fixo: 3 scans simultâneos (seguro para evitar rate limiting da API Sucuri)
    const maxConcurrent = 3;
    let scannedCount = 0;
    let errorCount = 0;
    const totalBatches = Math.ceil(sites.length / maxConcurrent);
    
    for (let i = 0; i < sites.length; i += maxConcurrent) {
      const batch = sites.slice(i, i + maxConcurrent);
      const batchNumber = Math.floor(i / maxConcurrent) + 1;
      
      console.log(`[Auto Scan] Lote ${batchNumber}/${totalBatches}: Escaneando ${batch.length} site(s) simultaneamente...`);
      console.log(`[Auto Scan] Sites: ${batch.map(s => s.domain).join(', ')}`);
      
      const batchStartTime = Date.now();
      const results = await Promise.allSettled(batch.map(site => scanSiteItem(site)));
      const batchDuration = Math.round((Date.now() - batchStartTime) / 1000);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          scannedCount++;
        } else {
          errorCount++;
          console.error(`[Auto Scan] Erro ao escanear ${batch[index].domain}:`, result.reason);
        }
      });
      
      console.log(`[Auto Scan] Lote ${batchNumber}/${totalBatches} concluído em ${batchDuration} segundo(s)`);
      
      // Delay entre lotes para não sobrecarregar a API
      if (i + maxConcurrent < sites.length) {
        console.log(`[Auto Scan] Aguardando 2 segundos antes do próximo lote...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log('');
    console.log(`[Auto Scan] ========================================`);
    console.log(`[Auto Scan] SCAN AUTOMÁTICO CONCLUÍDO`);
    console.log(`[Auto Scan] Data/Hora: ${endTime.toLocaleString('pt-BR')}`);
    console.log(`[Auto Scan] ========================================`);
    console.log(`[Auto Scan] Resultados:`);
    console.log(`  - Sites escaneados: ${scannedCount}`);
    console.log(`  - Erros: ${errorCount}`);
    console.log(`  - Tempo total: ${duration} segundos`);
    console.log(`[Auto Scan] Próximo scan será executado em 6 horas (pelo cron)`);
    console.log(`[Auto Scan] ========================================`);
    console.log('');
  } catch (error) {
    console.error('[Auto Scan] Erro no scan automático:', error);
    console.error('[Auto Scan] Stack:', error.stack);
  }
}

/**
 * Iniciar serviço de scan automático
 */
async function startAutoScan() {
  try {
    console.log('[Auto Scan] ========================================');
    console.log('[Auto Scan] INICIANDO SERVIÇO DE SCAN AUTOMÁTICO');
    console.log('[Auto Scan] ========================================');
    console.log('[Auto Scan] Lendo configurações do banco de dados...');
    
    // Parar task anterior se existir (segurança extra)
    if (scanTask) {
      console.log('[Auto Scan] ATENÇÃO: Task anterior ainda existe! Parando...');
      try {
        scanTask.stop();
        scanTask.destroy && scanTask.destroy();
      } catch (error) {
        console.error('[Auto Scan] Erro ao parar task anterior:', error);
      }
      scanTask = null;
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const config = await getScanSettings();
    console.log('[Auto Scan] Configurações obtidas do banco:');
    console.log(JSON.stringify(config, null, 2));
    console.log('');

    if (!config.enabled) {
      console.log('[Auto Scan] Scan automático desabilitado nas configurações');
      console.log('[Auto Scan] Para habilitar, vá em Configurações e ative o scan automático');
      return;
    }

    // Intervalo fixo: 6 horas
    const cronExpression = getCronExpression(config.value, config.unit);
    console.log(`[Auto Scan] Configurando scan automático:`);
    console.log(`   - Expressão Cron: ${cronExpression}`);
    console.log(`   - Intervalo: 6 horas (FIXO)`);
    console.log(`   - Scans simultâneos: ${config.maxConcurrent}`);

    // Validar expressão cron
    if (!cron.validate(cronExpression)) {
      console.error(`[Auto Scan] Expressão cron inválida: ${cronExpression}`);
      console.error(`[Auto Scan] Valores: value=${config.value}, unit=${config.unit}`);
      return;
    }

    console.log(`[Auto Scan] Expressão cron validada com sucesso: ${cronExpression}`);

    // Verificar se já existe uma task com a mesma expressão (evitar duplicatas)
    if (scanTask && currentCronExpression === cronExpression) {
      console.log(`[Auto Scan] Task já existe com a mesma expressão cron: ${cronExpression}`);
      console.log(`[Auto Scan] Mantendo task existente.`);
      return;
    }

    // Se há uma task diferente, parar antes de criar nova
    if (scanTask) {
      console.log(`[Auto Scan] Parando task anterior com expressão: ${currentCronExpression}`);
      console.log(`[Auto Scan] Nova expressão: ${cronExpression}`);
      try {
        scanTask.stop();
        scanTask.destroy && scanTask.destroy();
      } catch (error) {
        console.error('[Auto Scan] Erro ao parar task anterior:', error);
      }
      scanTask = null;
      currentCronExpression = null;
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Armazenar expressão cron atual
    currentCronExpression = cronExpression;

    // Criar task cron
    console.log(`[Auto Scan] Criando nova task cron com expressão: ${cronExpression}`);
    scanTask = cron.schedule(cronExpression, async () => {
      const now = new Date();
      console.log(`[Auto Scan] ========================================`);
      console.log(`[Auto Scan] Executando scan agendado às ${now.toLocaleString('pt-BR')}`);
      console.log(`[Auto Scan] Intervalo: 6 horas (FIXO)`);
      console.log(`[Auto Scan] ========================================`);
      await runAutoScan();
    }, {
      scheduled: true,
      timezone: "America/Sao_Paulo"
    });

    console.log('[Auto Scan] Serviço de scan automático iniciado com sucesso!');
    console.log(`[Auto Scan] Scans serão executados automaticamente a cada 6 horas`);
    console.log(`[Auto Scan] Expressão cron ativa: ${cronExpression}`);
    console.log(`[Auto Scan] Esta expressão executa: 00:00, 06:00, 12:00, 18:00 (horário de Brasília)`);
    console.log(`[Auto Scan] Task criada e agendada.`);
    console.log('');
    
    // NÃO executar primeiro scan imediatamente para evitar scans frequentes
    // O scan será executado apenas quando o cron agendar (a cada 6 horas)
    console.log('[Auto Scan] IMPORTANTE: Primeiro scan será executado automaticamente pelo cron quando chegar a hora agendada.');
    console.log('[Auto Scan] NÃO haverá scan imediato ao iniciar o serviço.');
    console.log('[Auto Scan] Isso evita scans frequentes quando o backend reinicia.');
    console.log('');
    
  } catch (error) {
    console.error('[Auto Scan] Erro ao iniciar serviço:', error);
    console.error('[Auto Scan] Stack:', error.stack);
  }
}

/**
 * Parar serviço de scan automático
 */
function stopAutoScan() {
  if (scanTask) {
    try {
      scanTask.stop();
      scanTask.destroy && scanTask.destroy();
    } catch (error) {
      console.error('[Auto Scan] Erro ao parar task:', error);
    }
    scanTask = null;
    currentCronExpression = null;
    console.log('[Auto Scan] Serviço de scan automático parado');
  }
}

/**
 * Reiniciar serviço (útil quando configurações mudam)
 */
async function restartAutoScan() {
  console.log('[Auto Scan] ========================================');
  console.log('[Auto Scan] REINICIANDO SERVIÇO DE SCAN AUTOMÁTICO');
  console.log('[Auto Scan] ========================================');
  
  // Parar task anterior se existir
  if (scanTask) {
    console.log('[Auto Scan] Parando task anterior...');
    try {
      scanTask.stop();
      scanTask.destroy && scanTask.destroy(); // Destruir se o método existir
      console.log('[Auto Scan] Task anterior parada e destruída');
    } catch (error) {
      console.error('[Auto Scan] Erro ao parar task anterior:', error);
    }
    scanTask = null;
    currentCronExpression = null;
  }
  
  // Aguardar um pouco para garantir que a task foi completamente parada
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('[Auto Scan] Lendo novas configurações do banco...');
  await startAutoScan();
  
  console.log('[Auto Scan] ========================================');
  console.log('[Auto Scan] REINÍCIO CONCLUÍDO');
  console.log('[Auto Scan] ========================================');
  console.log('');
}

/**
 * Obter status do serviço de scan automático
 */
async function getAutoScanStatus() {
  try {
    const config = await getScanSettings();
    let isRunning = false;
    let taskStatus = 'not_started';
    
    if (scanTask) {
      try {
        taskStatus = scanTask.getStatus();
        isRunning = taskStatus === 'scheduled' || taskStatus === 'running';
      } catch (e) {
        // Se getStatus() não estiver disponível, verificar se task existe
        isRunning = scanTask !== null;
        taskStatus = scanTask !== null ? 'active' : 'stopped';
      }
    }
    
    const cronExpression = config.enabled ? getCronExpression(config.value, config.unit) : null;
    
    return {
      enabled: config.enabled,
      running: isRunning,
      taskStatus,
      interval: config.enabled ? '6 horas (FIXO)' : null,
      cronExpression,
      currentCronExpression, // Expressão cron da task ativa
      config,
      hasTask: scanTask !== null,
      configMatches: config.enabled && cronExpression === currentCronExpression
    };
  } catch (error) {
    console.error('Error getting auto scan status:', error);
    return {
      enabled: false,
      running: false,
      error: error.message
    };
  }
}

module.exports = {
  startAutoScan,
  stopAutoScan,
  restartAutoScan,
  runAutoScan,
  getScanSettings,
  getAutoScanStatus
};

