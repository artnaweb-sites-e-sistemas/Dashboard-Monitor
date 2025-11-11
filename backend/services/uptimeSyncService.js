/**
 * Uptime Sync Service
 * Serviço para sincronizar dados de uptime do UptimeRobot periodicamente
 */

const cron = require('node-cron');
const uptimerobotService = require('./uptimerobotService');

let syncTask = null;

/**
 * Iniciar serviço de sincronização de uptime
 */
async function startUptimeSync() {
  try {
    console.log('[Uptime Sync] Verificando configurações...');
    
    // Parar task anterior se existir
    if (syncTask) {
      console.log('[Uptime Sync] Parando task anterior...');
      syncTask.stop();
      syncTask = null;
    }

    const enabled = await uptimerobotService.isEnabled();
    
    if (!enabled) {
      console.log('[Uptime Sync] Integração com UptimeRobot desabilitada');
      return;
    }

    const apiKey = await uptimerobotService.getApiKey();
    if (!apiKey) {
      console.log('[Uptime Sync] API key do UptimeRobot não configurada');
      return;
    }

    // Sincronizar a cada 5 minutos
    const cronExpression = '*/5 * * * *';
    
    console.log(`[Uptime Sync] Configurando sincronização automática:`);
    console.log(`   - Expressão Cron: ${cronExpression}`);
    console.log(`   - Intervalo: 5 minutos`);

    // Validar expressão cron
    if (!cron.validate(cronExpression)) {
      console.error(`[Uptime Sync] Expressão cron inválida: ${cronExpression}`);
      return;
    }

    // Criar task cron
    syncTask = cron.schedule(cronExpression, async () => {
      const now = new Date();
      console.log(`[Uptime Sync] ========================================`);
      console.log(`[Uptime Sync] ⏰ Executando sincronização automática`);
      console.log(`[Uptime Sync] Timestamp: ${now.toISOString()}`);
      console.log(`[Uptime Sync] Horário local: ${now.toLocaleString('pt-BR')}`);
      console.log(`[Uptime Sync] ========================================`);
      try {
        const result = await uptimerobotService.syncUptimeData();
        console.log(`[Uptime Sync] ✅ Sincronização automática concluída: ${result.updated || 0} site(s) atualizado(s)`);
      } catch (error) {
        console.error(`[Uptime Sync] ❌ Erro na sincronização automática:`, error);
        console.error(`[Uptime Sync] Stack:`, error.stack);
      }
      console.log(`[Uptime Sync] ========================================`);
    }, {
      scheduled: true,
      timezone: "America/Sao_Paulo"
    });

    console.log('[Uptime Sync] Serviço de sincronização iniciado com sucesso!');
    console.log(`[Uptime Sync] Próxima sincronização será executada automaticamente a cada 5 minutos`);
    console.log('');
    
    // Executar primeira sincronização imediatamente
    console.log('[Uptime Sync] Executando primeira sincronização em background...');
    console.log('[Uptime Sync] Timestamp:', new Date().toISOString());
    uptimerobotService.syncUptimeData().then(result => {
      console.log('[Uptime Sync] ✅ Primeira sincronização concluída:', {
        success: result.success,
        updated: result.updated,
        totalMonitors: result.totalMonitors
      });
    }).catch(error => {
      console.error('[Uptime Sync] ❌ Erro na primeira sincronização:', error);
      console.error('[Uptime Sync] Stack:', error.stack);
    });
    
  } catch (error) {
    console.error('[Uptime Sync] Erro ao iniciar serviço:', error);
    console.error('[Uptime Sync] Stack:', error.stack);
  }
}

/**
 * Parar serviço de sincronização
 */
function stopUptimeSync() {
  if (syncTask) {
    syncTask.stop();
    syncTask = null;
    console.log('[Uptime Sync] Serviço de sincronização parado');
  }
}

/**
 * Reiniciar serviço
 */
async function restartUptimeSync() {
  console.log('[Uptime Sync] Reiniciando serviço...');
  stopUptimeSync();
  await new Promise(resolve => setTimeout(resolve, 500));
  await startUptimeSync();
}

module.exports = {
  startUptimeSync,
  stopUptimeSync,
  restartUptimeSync
};


