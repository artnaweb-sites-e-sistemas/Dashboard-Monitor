/**
 * UptimeRobot API Service
 * Integração com UptimeRobot para monitoramento de uptime/disponibilidade
 */

const axios = require('axios');

const UPTIMEROBOT_API_URL = 'https://api.uptimerobot.com/v2';

/**
 * Obter configuração da API key do UptimeRobot
 */
async function getApiKey() {
  try {
    const db = require('../config/database');
    const [settings] = await db.execute(
      'SELECT setting_value FROM settings WHERE setting_key = ?',
      ['uptimerobot_api_key']
    );
    
    if (settings.length === 0 || !settings[0].setting_value || settings[0].setting_value.trim() === '') {
      return null;
    }
    
    return settings[0].setting_value.trim();
  } catch (error) {
    console.error('[UptimeRobot] Erro ao obter API key:', error);
    return null;
  }
}

/**
 * Verificar se UptimeRobot está habilitado
 */
async function isEnabled() {
  try {
    const db = require('../config/database');
    const [settings] = await db.execute(
      'SELECT setting_value FROM settings WHERE setting_key = ?',
      ['uptimerobot_enabled']
    );
    
    if (settings.length === 0) {
      return false;
    }
    
    const value = settings[0].setting_value;
    return value === '1' || value === 'true' || value === true;
  } catch (error) {
    console.error('[UptimeRobot] Erro ao verificar se está habilitado:', error);
    return false;
  }
}

/**
 * Fazer requisição à API do UptimeRobot
 */
async function makeRequest(method, params = {}) {
  try {
    const apiKey = await getApiKey();
    
    if (!apiKey) {
      return {
        success: false,
        message: 'API key do UptimeRobot não configurada'
      };
    }

    const response = await axios.post(
      `${UPTIMEROBOT_API_URL}/${method}`,
      new URLSearchParams({
        api_key: apiKey,
        format: 'json',
        ...params
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache'
        },
        timeout: 30000
      }
    );

    // Log detalhado da resposta
    console.log(`[UptimeRobot] Resposta da API ${method}:`, {
      stat: response.data?.stat,
      message: response.data?.message,
      error: response.data?.error
    });

    if (response.data && response.data.stat === 'ok') {
      return {
        success: true,
        data: response.data
      };
    } else {
      const errorMessage = response.data?.message || response.data?.error?.message || 'Erro na resposta da API';
      console.error(`[UptimeRobot] Erro na resposta da API ${method}:`, {
        stat: response.data?.stat,
        message: errorMessage,
        fullResponse: JSON.stringify(response.data, null, 2)
      });
      return {
        success: false,
        message: errorMessage,
        error: response.data
      };
    }
  } catch (error) {
    console.error(`[UptimeRobot] Erro na requisição ${method}:`, error.message);
    console.error(`[UptimeRobot] Stack:`, error.stack);
    if (error.response) {
      console.error(`[UptimeRobot] Resposta de erro:`, {
        status: error.response.status,
        data: error.response.data
      });
    }
    return {
      success: false,
      message: error.response?.data?.message || error.response?.data?.error?.message || error.message,
      statusCode: error.response?.status || 500,
      error: error.response?.data
    };
  }
}

/**
 * Listar todos os monitores
 */
async function getMonitors() {
  console.log('[UptimeRobot] Buscando monitores da API...');
  // A API do UptimeRobot não aceita mais "-1" para todos os monitores
  // Não passar o parâmetro "monitors" retorna todos os monitores
  const result = await makeRequest('getMonitors', {
    // Não passar "monitors" retorna todos os monitores
    response_times: '1',
    response_times_average: '1',
    uptime_ratios: '1'
  });
  
  if (result.success && result.data) {
    console.log('[UptimeRobot] Monitores recebidos com sucesso');
    if (result.data.monitors && Array.isArray(result.data.monitors)) {
      console.log(`[UptimeRobot] Total de monitores: ${result.data.monitors.length}`);
    }
  }
  
  return result;
}

/**
 * Criar monitor para um site
 */
async function createMonitor(url, friendlyName, type = 1) {
  // type: 1 = HTTP(s), 2 = Keyword, 3 = Ping, 4 = Port
  return await makeRequest('newMonitor', {
    type: type.toString(),
    url: url,
    friendly_name: friendlyName,
    interval: '300' // 5 minutos (em segundos)
  });
}

/**
 * Editar monitor existente
 */
async function editMonitor(monitorId, url, friendlyName) {
  return await makeRequest('editMonitor', {
    id: monitorId,
    url: url,
    friendly_name: friendlyName
  });
}

/**
 * Deletar monitor
 */
async function deleteMonitor(monitorId) {
  return await makeRequest('deleteMonitor', {
    id: monitorId
  });
}

/**
 * Obter estatísticas de um monitor específico
 */
async function getMonitorStats(monitorId) {
  return await makeRequest('getMonitors', {
    monitors: monitorId,
    response_times: '1',
    response_times_average: '1',
    uptime_ratios: '1'
  });
}

/**
 * Sincronizar dados de uptime de todos os sites
 */
async function syncUptimeData() {
  try {
    const enabled = await isEnabled();
    if (!enabled) {
      console.log('[UptimeRobot] Integração desabilitada, pulando sincronização');
      return { success: true, message: 'Integração desabilitada' };
    }

    const apiKey = await getApiKey();
    if (!apiKey) {
      return { success: false, message: 'API key não configurada' };
    }

    console.log('[UptimeRobot] ========================================');
    console.log('[UptimeRobot] 🚀 INICIANDO SINCRONIZAÇÃO DE UPTIME');
    console.log('[UptimeRobot] ========================================');
    console.log(`[UptimeRobot] Timestamp: ${new Date().toISOString()}`);
    console.log(`[UptimeRobot] API Key configurada: ${apiKey ? 'Sim (' + apiKey.substring(0, 10) + '...)' : 'Não'}`);
    
    // Buscar todos os monitores do UptimeRobot
    console.log('[UptimeRobot] Buscando monitores da API do UptimeRobot...');
    const monitorsResult = await getMonitors();
    
    if (!monitorsResult.success) {
      console.error('[UptimeRobot] ❌ ERRO ao buscar monitores:', monitorsResult.message);
      console.error('[UptimeRobot] Detalhes do erro:', JSON.stringify(monitorsResult.error || monitorsResult, null, 2));
      return monitorsResult;
    }

    const monitors = monitorsResult.data?.monitors || [];
    console.log(`[UptimeRobot] ✅ ${monitors.length} monitor(es) encontrado(s) na API`);
    
    if (monitors.length === 0) {
      console.log('[UptimeRobot] ⚠️ Nenhum monitor encontrado no UptimeRobot');
      console.log('[UptimeRobot] Verifique se há monitores criados no UptimeRobot');
      return {
        success: true,
        updated: 0,
        created: 0,
        totalMonitors: 0,
        message: 'Nenhum monitor encontrado'
      };
    }
    
    // Listar todos os monitores encontrados
    console.log('[UptimeRobot] Lista de monitores encontrados:');
    monitors.forEach((m, index) => {
      console.log(`[UptimeRobot]   ${index + 1}. ID: ${m.id}, URL: ${m.url}, Status: ${m.status}`);
    });

    const db = require('../config/database');
    let updated = 0;
    let created = 0;

    // Atualizar dados de uptime para cada monitor
    for (const monitor of monitors) {
      try {
        console.log(`[UptimeRobot] ========================================`);
        console.log(`[UptimeRobot] Processando monitor ID: ${monitor.id}`);
        console.log(`[UptimeRobot] Monitor URL: ${monitor.url}`);
        console.log(`[UptimeRobot] Monitor Status Code: ${monitor.status}`);
        console.log(`[UptimeRobot] Monitor Status Type: ${typeof monitor.status}`);
        console.log(`[UptimeRobot] Monitor Data:`, JSON.stringify({
          id: monitor.id,
          url: monitor.url,
          status: monitor.status,
          friendly_name: monitor.friendly_name
        }, null, 2));
        
        // Buscar site pelo monitor_id
        // Tentar tanto como string quanto como número para garantir compatibilidade
        const monitorIdStr = monitor.id.toString();
        const monitorIdNum = parseInt(monitor.id);
        
        console.log(`[UptimeRobot] Buscando site com monitor_id: "${monitorIdStr}" (tipo: ${typeof monitor.id})`);
        
        const [sites] = await db.execute(
          `SELECT id, domain, uptimerobot_monitor_id, uptime_status FROM sites 
           WHERE uptimerobot_monitor_id = ? OR uptimerobot_monitor_id = ?`,
          [monitorIdStr, monitorIdNum]
        );

        console.log(`[UptimeRobot] Sites encontrados no banco: ${sites.length}`);

        if (sites.length > 0) {
          const site = sites[0];
          console.log(`[UptimeRobot] Site encontrado: ID=${site.id}, Domain=${site.domain}`);
          console.log(`[UptimeRobot] Status atual no banco: ${site.uptime_status}`);
          console.log(`[UptimeRobot] Monitor ID no banco: ${site.uptimerobot_monitor_id}`);
          
          console.log(`[UptimeRobot] Chamando updateSiteUptimeData para site ${site.id}...`);
          await updateSiteUptimeData(site.id, monitor);
          updated++;
          console.log(`[UptimeRobot] Site ${site.id} atualizado com sucesso!`);
        } else {
          // Monitor existe no UptimeRobot mas não está vinculado a nenhum site
          console.log(`[UptimeRobot] ⚠️ Monitor ${monitor.id} (${monitor.url}) não vinculado a nenhum site`);
          console.log(`[UptimeRobot] Verificando se há sites com este domínio...`);
          
          // Tentar encontrar por URL/domínio
          const domain = monitor.url?.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
          if (domain) {
            const [sitesByDomain] = await db.execute(
              `SELECT id, domain, uptimerobot_monitor_id FROM sites WHERE domain LIKE ?`,
              [`%${domain}%`]
            );
            console.log(`[UptimeRobot] Sites encontrados por domínio "${domain}": ${sitesByDomain.length}`);
            if (sitesByDomain.length > 0) {
              sitesByDomain.forEach(s => {
                console.log(`[UptimeRobot]   - Site ID: ${s.id}, Domain: ${s.domain}, Monitor ID: ${s.uptimerobot_monitor_id || 'NÃO VINCULADO'}`);
              });
            }
          }
        }
        console.log(`[UptimeRobot] ========================================`);
      } catch (error) {
        console.error(`[UptimeRobot] ❌ Erro ao processar monitor ${monitor.id}:`, error);
        console.error(`[UptimeRobot] Stack:`, error.stack);
      }
    }

    console.log('[UptimeRobot] ========================================');
    console.log(`[UptimeRobot] ✅ SINCRONIZAÇÃO CONCLUÍDA`);
    console.log(`[UptimeRobot] Total de monitores processados: ${monitors.length}`);
    console.log(`[UptimeRobot] Sites atualizados: ${updated}`);
    console.log(`[UptimeRobot] Timestamp: ${new Date().toISOString()}`);
    console.log('[UptimeRobot] ========================================');
    
    return {
      success: true,
      updated,
      created,
      totalMonitors: monitors.length
    };
  } catch (error) {
    console.error('[UptimeRobot] Erro na sincronização:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Criar monitor no UptimeRobot para um site
 */
async function createMonitorForSite(siteId, domain) {
  try {
    const enabled = await isEnabled();
    if (!enabled) {
      return { success: false, message: 'Integração com UptimeRobot desabilitada' };
    }

    const apiKey = await getApiKey();
    if (!apiKey) {
      return { success: false, message: 'API key do UptimeRobot não configurada' };
    }

    // Verificar se já existe monitor para este site
    const db = require('../config/database');
    const [sites] = await db.execute(
      'SELECT uptimerobot_monitor_id FROM sites WHERE id = ?',
      [siteId]
    );

    if (sites.length > 0 && sites[0].uptimerobot_monitor_id) {
      // Monitor já existe, apenas atualizar
      const result = await editMonitor(
        sites[0].uptimerobot_monitor_id,
        domain,
        `ArtnaWEB Monitor - ${domain}`
      );

      if (result.success) {
        return { success: true, monitorId: sites[0].uptimerobot_monitor_id, updated: true };
      }
    }

    // Criar novo monitor
    const result = await createMonitor(
      domain,
      `ArtnaWEB Monitor - ${domain}`
    );

    if (result.success && result.data?.monitor?.id) {
      const monitorId = result.data.monitor.id.toString();
      console.log(`[UptimeRobot] Monitor criado com sucesso: ID=${monitorId} para site=${siteId}`);
      
      // Atualizar site com o monitor_id
      await db.execute(
        'UPDATE sites SET uptimerobot_monitor_id = ? WHERE id = ?',
        [monitorId, siteId]
      );

      console.log(`[UptimeRobot] Monitor ID ${monitorId} salvo no banco para site ${siteId}`);
      
      // Buscar dados do monitor recém-criado imediatamente
      try {
        console.log(`[UptimeRobot] Buscando dados do monitor ${monitorId}...`);
        const monitorStats = await getMonitorStats(monitorId);
        
        if (monitorStats.success && monitorStats.data?.monitors && monitorStats.data.monitors.length > 0) {
          const monitor = monitorStats.data.monitors[0];
          await updateSiteUptimeData(siteId, monitor);
          console.log(`[UptimeRobot] Dados do monitor ${monitorId} atualizados com sucesso`);
        } else {
          console.log(`[UptimeRobot] Monitor ${monitorId} ainda não está disponível na API, aguardando...`);
          // Se não estiver disponível, aguardar e tentar novamente
          setTimeout(async () => {
            try {
              const syncResult = await syncUptimeData();
              if (syncResult.success) {
                console.log(`[UptimeRobot] Sincronização concluída: ${syncResult.updated} site(s) atualizado(s)`);
              }
            } catch (error) {
              console.error(`[UptimeRobot] Erro na sincronização:`, error);
            }
          }, 5000); // Aguardar 5 segundos
        }
      } catch (error) {
        console.error(`[UptimeRobot] Erro ao buscar dados do monitor:`, error);
        // Continuar mesmo com erro, a sincronização automática vai pegar depois
      }

      return { success: true, monitorId, created: true };
    }

    console.error(`[UptimeRobot] Erro ao criar monitor:`, result);
    return result;
  } catch (error) {
    console.error('[UptimeRobot] Erro ao criar monitor:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Remover monitor do UptimeRobot
 */
async function deleteMonitorForSite(siteId) {
  try {
    const db = require('../config/database');
    const [sites] = await db.execute(
      'SELECT uptimerobot_monitor_id FROM sites WHERE id = ?',
      [siteId]
    );

    if (sites.length === 0 || !sites[0].uptimerobot_monitor_id) {
      return { success: true, message: 'Nenhum monitor encontrado' };
    }

    const monitorId = sites[0].uptimerobot_monitor_id;
    const result = await deleteMonitor(monitorId);

    if (result.success) {
      // Remover monitor_id do site
      await db.execute(
        'UPDATE sites SET uptimerobot_monitor_id = NULL WHERE id = ?',
        [siteId]
      );
    }

    return result;
  } catch (error) {
    console.error('[UptimeRobot] Erro ao deletar monitor:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Atualizar dados de uptime de um site no banco
 */
async function updateSiteUptimeData(siteId, monitor) {
  try {
    const db = require('../config/database');
    const emailService = require('./emailService');
    
    // Buscar status anterior do site
    const [sites] = await db.execute(
      'SELECT id, domain, uptime_status, last_uptime_status FROM sites WHERE id = ?',
      [siteId]
    );
    
    if (sites.length === 0) {
      throw new Error(`Site ${siteId} não encontrado`);
    }
    
    const site = sites[0];
    
    // IMPORTANTE: Usar APENAS last_uptime_status como referência para mudanças
    // last_uptime_status é atualizado apenas quando há mudança real de status
    // Se last_uptime_status for null, é a primeira verificação e não deve enviar notificação
    // NÃO usar uptime_status como fallback, pois ele pode estar desatualizado
    const previousStatus = site.last_uptime_status || null;
    
    console.log(`[UptimeRobot] Site ${site.domain} (ID: ${siteId}) - Status anterior: ${previousStatus || 'null (primeira vez)'}`);
    console.log(`[UptimeRobot] Monitor status code: ${monitor.status}`);
    
    // Determinar status de uptime baseado no código do monitor
    // Códigos do UptimeRobot (conforme documentação oficial):
    // 0 = Pausado (Paused)
    // 1 = Não verificado ainda (Not checked yet)
    // 2 = Up (Online) - Site está funcionando
    // 8 = Parece estar offline (Seems Down) - Site pode estar offline
    // 9 = Down (Offline) - Site confirmadamente offline
    let uptimeStatus = 'unknown';
    if (monitor.status === 0) {
      uptimeStatus = 'paused';
    } else if (monitor.status === 1) {
      uptimeStatus = 'unknown'; // Monitor ainda não verificou
    } else if (monitor.status === 2) {
      uptimeStatus = 'up'; // Site está ONLINE
    } else if (monitor.status === 8) {
      uptimeStatus = 'seems_down'; // Site parece estar offline
    } else if (monitor.status === 9) {
      uptimeStatus = 'down'; // Site está OFFLINE
    }
    
    console.log(`[UptimeRobot] ========================================`);
    console.log(`[UptimeRobot] 📊 PROCESSANDO STATUS DO MONITOR`);
    console.log(`[UptimeRobot] Monitor ID: ${monitor.id}`);
    console.log(`[UptimeRobot] Monitor URL: ${monitor.url || 'N/A'}`);
    console.log(`[UptimeRobot] Código de status recebido: ${monitor.status} (tipo: ${typeof monitor.status})`);
    console.log(`[UptimeRobot] Status determinado: ${uptimeStatus}`);
    console.log(`[UptimeRobot] Mapeamento: ${monitor.status} -> ${uptimeStatus}`);
    
    // Log detalhado do monitor
    console.log(`[UptimeRobot] Dados completos do monitor:`, {
      id: monitor.id,
      url: monitor.url,
      status: monitor.status,
      status_raw: monitor.status,
      friendly_name: monitor.friendly_name,
      uptime_ratio: monitor.uptime_ratio,
      average_response_time: monitor.average_response_time
    });

    // Calcular uptime ratio (percentual)
    // A API pode retornar como string "99.999%" ou como número
    let uptimeRatio = null;
    if (monitor.uptime_ratio) {
      const ratioStr = monitor.uptime_ratio.toString().replace('%', '');
      uptimeRatio = parseFloat(ratioStr);
    }

    // Obter tempo médio de resposta (pode estar em diferentes campos)
    // A API do UptimeRobot retorna response_times como array ou average_response_time
    let responseTime = null;
    
    // Log dos dados recebidos para diagnóstico
    if (monitor.id) {
      console.log(`[UptimeRobot] Monitor ${monitor.id} - Dados de response time:`, {
        average_response_time: monitor.average_response_time,
        response_time: monitor.response_time,
        has_response_times_array: Array.isArray(monitor.response_times),
        response_times_length: Array.isArray(monitor.response_times) ? monitor.response_times.length : 0
      });
    }
    
    // Tentar obter de average_response_time primeiro (mais confiável)
    if (monitor.average_response_time) {
      const parsed = parseInt(monitor.average_response_time);
      if (!isNaN(parsed) && parsed > 0) {
        responseTime = parsed;
        console.log(`[UptimeRobot] Response time obtido de average_response_time: ${responseTime}ms`);
      }
    }
    
    // Se não tiver average_response_time, tentar response_times (array)
    if (!responseTime && monitor.response_times && Array.isArray(monitor.response_times) && monitor.response_times.length > 0) {
      // Pegar o último valor do array (mais recente)
      const lastResponseTime = monitor.response_times[monitor.response_times.length - 1];
      if (lastResponseTime) {
        // Pode ser um objeto com propriedade 'value' ou um número direto
        const timeValue = lastResponseTime.value || lastResponseTime;
        const parsed = parseInt(timeValue);
        if (!isNaN(parsed) && parsed > 0) {
          responseTime = parsed;
          console.log(`[UptimeRobot] Response time obtido de response_times array: ${responseTime}ms`);
        }
      }
    }
    
    // Se ainda não tiver, tentar response_time direto
    if (!responseTime && monitor.response_time) {
      const parsed = parseInt(monitor.response_time);
      if (!isNaN(parsed) && parsed > 0) {
        responseTime = parsed;
        console.log(`[UptimeRobot] Response time obtido de response_time: ${responseTime}ms`);
      }
    }
    
    // Se for 0 ou null, considerar como dados não disponíveis (monitor recém-criado ou sem dados suficientes)
    if (!responseTime || responseTime === 0) {
      console.log(`[UptimeRobot] Response time não disponível para monitor ${monitor.id} (pode ser monitor recém-criado ou sem dados suficientes)`);
      responseTime = null;
    }

    // Normalizar status para comparação (considerar 'seems_down' como 'down')
    // Isso garante que 'seems_down' e 'down' sejam tratados como o mesmo estado
    const normalizeStatus = (status) => {
      if (!status || status === 'unknown' || status === 'paused') return null;
      if (status === 'seems_down' || status === 'down') return 'down';
      if (status === 'up') return 'up';
      return null;
    };
    
    const normalizedPrevious = normalizeStatus(previousStatus);
    const normalizedCurrent = normalizeStatus(uptimeStatus);
    
    // Verificar se houve mudança REAL de status
    // Só considera mudança se ambos os status forem válidos e diferentes
    const statusReallyChanged = normalizedPrevious !== null && 
                                normalizedCurrent !== null && 
                                normalizedPrevious !== normalizedCurrent;
    
    // Detectar se site caiu (estava online e agora está offline)
    const wentDown = statusReallyChanged && normalizedPrevious === 'up' && normalizedCurrent === 'down';
    
    // Detectar se site voltou (estava offline e agora está online)
    const cameBackUp = statusReallyChanged && normalizedPrevious === 'down' && normalizedCurrent === 'up';
    
    console.log(`[UptimeRobot] Análise de mudança:`);
    console.log(`  - Status anterior: ${previousStatus || 'null'} (normalizado: ${normalizedPrevious || 'null'})`);
    console.log(`  - Status atual: ${uptimeStatus} (normalizado: ${normalizedCurrent || 'null'})`);
    console.log(`  - Mudança real detectada: ${statusReallyChanged}`);
    console.log(`  - Site caiu: ${wentDown}`);
    console.log(`  - Site voltou: ${cameBackUp}`);
    
    // Atualizar site
    // IMPORTANTE: Só atualizar last_uptime_status quando houver mudança REAL de status
    // Isso garante que não enviaremos múltiplos emails enquanto o site permanece no mesmo estado
    if (statusReallyChanged) {
      // Houve mudança real: salvar o status anterior como last_uptime_status
      await db.execute(
        `UPDATE sites SET 
         uptimerobot_monitor_id = ?,
         last_uptime_status = ?,
         uptime_status = ?,
         uptime_last_check = NOW(),
         uptime_uptime_ratio = ?,
         uptime_response_time = ?
         WHERE id = ?`,
        [
          monitor.id.toString(),
          site.uptime_status || previousStatus, // Status anterior (antes da mudança)
          uptimeStatus, // Novo status
          uptimeRatio,
          responseTime,
          siteId
        ]
      );
    } else {
      // Não houve mudança real: apenas atualizar uptime_status e dados de monitoramento
      // NÃO atualizar last_uptime_status (mantém o valor anterior)
      await db.execute(
        `UPDATE sites SET 
         uptimerobot_monitor_id = ?,
         uptime_status = ?,
         uptime_last_check = NOW(),
         uptime_uptime_ratio = ?,
         uptime_response_time = ?
         WHERE id = ?`,
        [
          monitor.id.toString(),
          uptimeStatus, // Novo status (mas sem mudança real)
          uptimeRatio,
          responseTime,
          siteId
        ]
      );
    }

    // Verificar se a atualização foi bem-sucedida
    const [verifySites] = await db.execute(
      'SELECT uptime_status, last_uptime_status, uptime_last_check FROM sites WHERE id = ?',
      [siteId]
    );
    
    if (verifySites.length > 0) {
      const verified = verifySites[0];
      console.log(`[UptimeRobot] ✅ Site ${siteId} (${site.domain}) atualizado no banco:`);
      console.log(`  - Status ANTES: ${previousStatus || 'null'}`);
      console.log(`  - Status DEPOIS: ${verified.uptime_status} (esperado: ${uptimeStatus})`);
      console.log(`  - Last Uptime Status: ${verified.last_uptime_status || 'null'}`);
      console.log(`  - Uptime Ratio: ${uptimeRatio}%`);
      console.log(`  - Response Time: ${responseTime}ms`);
      console.log(`  - Last Check: ${verified.uptime_last_check || 'null'}`);
      
      if (verified.uptime_status !== uptimeStatus) {
        console.error(`[UptimeRobot] ⚠️ ATENÇÃO: Status no banco (${verified.uptime_status}) não corresponde ao esperado (${uptimeStatus})!`);
      }
    } else {
      console.error(`[UptimeRobot] ❌ ERRO: Não foi possível verificar a atualização do site ${siteId}!`);
    }

    // Enviar notificações de uptime se houve mudança significativa
    // IMPORTANTE: Só enviar se realmente houve mudança (statusReallyChanged)
    // Isso garante que não enviaremos múltiplos emails enquanto o site permanece no mesmo estado
    if (statusReallyChanged && (wentDown || cameBackUp)) {
      try {
        if (wentDown) {
          console.log(`[UptimeRobot] ========================================`);
          console.log(`[UptimeRobot] ALERTA: Site ${site.domain} CAIU!`);
          console.log(`[UptimeRobot] Status anterior: ${previousStatus}`);
          console.log(`[UptimeRobot] Status atual: ${uptimeStatus}`);
          console.log(`[UptimeRobot] Enviando email de notificação...`);
          console.log(`[UptimeRobot] ========================================`);
          
          const emailSent = await emailService.sendUptimeAlertEmail(site.domain, 'down', {
            status: uptimeStatus,
            previousStatus: previousStatus,
            responseTime: responseTime,
            uptimeRatio: uptimeRatio
          });
          
          if (emailSent) {
            console.log(`[UptimeRobot] Email de alerta (site down) enviado com sucesso para ${site.domain}`);
          } else {
            console.error(`[UptimeRobot] Falha ao enviar email de alerta (site down) para ${site.domain}`);
          }
        } else if (cameBackUp) {
          console.log(`[UptimeRobot] ========================================`);
          console.log(`[UptimeRobot] INFO: Site ${site.domain} VOLTOU!`);
          console.log(`[UptimeRobot] Status anterior: ${previousStatus}`);
          console.log(`[UptimeRobot] Status atual: ${uptimeStatus}`);
          console.log(`[UptimeRobot] Enviando email de notificação...`);
          console.log(`[UptimeRobot] ========================================`);
          
          const emailSent = await emailService.sendUptimeAlertEmail(site.domain, 'up', {
            status: uptimeStatus,
            previousStatus: previousStatus,
            responseTime: responseTime,
            uptimeRatio: uptimeRatio
          });
          
          if (emailSent) {
            console.log(`[UptimeRobot] Email de alerta (site up) enviado com sucesso para ${site.domain}`);
          } else {
            console.error(`[UptimeRobot] Falha ao enviar email de alerta (site up) para ${site.domain}`);
          }
        }
      } catch (emailError) {
        console.error(`[UptimeRobot] Erro ao enviar email de uptime para ${site.domain}:`, emailError);
        console.error(`[UptimeRobot] Stack:`, emailError.stack);
        // Não falhar a atualização se o email falhar
      }
    } else {
      if (!statusReallyChanged) {
        console.log(`[UptimeRobot] Nenhuma mudança de status detectada para ${site.domain}`);
        console.log(`  - Status anterior: ${previousStatus || 'null'} (normalizado: ${normalizedPrevious || 'null'})`);
        console.log(`  - Status atual: ${uptimeStatus} (normalizado: ${normalizedCurrent || 'null'})`);
        if (normalizedPrevious === null) {
          console.log(`  - Nota: Primeira verificação ou status anterior inválido, notificação não será enviada`);
        } else if (normalizedPrevious === normalizedCurrent) {
          console.log(`  - Nota: Status permanece o mesmo (${normalizedCurrent}), notificação não será enviada`);
        }
      }
    }
  } catch (error) {
    console.error(`[UptimeRobot] Erro ao atualizar dados do site ${siteId}:`, error);
    throw error;
  }
}

/**
 * Obter status de uptime de um site
 */
function getUptimeStatusText(status) {
  const statusMap = {
    'up': 'Online',
    'down': 'Offline',
    'seems_down': 'Parece Offline',
    'paused': 'Pausado',
    'unknown': 'Desconhecido'
  };
  return statusMap[status] || 'Desconhecido';
}

/**
 * Obter cor do status de uptime
 */
function getUptimeStatusColor(status) {
  const colorMap = {
    'up': '#34d399', // verde
    'down': '#f87171', // vermelho
    'seems_down': '#fbbf24', // amarelo
    'paused': '#9ca3af', // cinza
    'unknown': '#9ca3af' // cinza
  };
  return colorMap[status] || '#9ca3af';
}

module.exports = {
  getApiKey,
  isEnabled,
  getMonitors,
  createMonitor,
  editMonitor,
  deleteMonitor,
  getMonitorStats,
  syncUptimeData,
  createMonitorForSite,
  deleteMonitorForSite,
  updateSiteUptimeData,
  getUptimeStatusText,
  getUptimeStatusColor
};

