/**
 * Wordfence Service
 * Integração com Wordfence para varredura de arquivos WordPress
 * 
 * REQUER: Endpoint customizado no WordPress do cliente
 * Instale o código em wordpress-endpoint-example.php no WordPress do cliente
 * 
 * O endpoint estará disponível em:
 * https://site-do-cliente.com/wp-json/artna-monitor/v1/wordfence-status?api_key=SUA_API_KEY
 */

const axios = require('axios');

/**
 * Verificar status do scan do Wordfence
 * Acessa o endpoint customizado no WordPress do cliente
 */
async function checkWordfenceScan(domain, apiKey) {
  try {
    if (!apiKey || !apiKey.trim()) {
      return {
        success: false,
        message: 'API key do Wordfence não configurada'
      };
    }

    // Normalizar URL do domínio
    let baseUrl = domain.trim();
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'https://' + baseUrl;
    }
    // Remover barra final se houver
    baseUrl = baseUrl.replace(/\/$/, '');

    console.log(`[Wordfence] Verificando scan para: ${baseUrl}`);
    console.log(`[Wordfence] API Key fornecida: ${apiKey ? apiKey.substring(0, 10) + '...' : 'NÃO FORNECIDA'}`);

    // Acessar via endpoint customizado do WordPress
    // REQUER: Instalar o código em wordpress-endpoint-example.php no WordPress do cliente
    const customEndpoint = `${baseUrl}/wp-json/artna-monitor/v1/wordfence-status`;
    console.log(`[Wordfence] Endpoint: ${customEndpoint}`);
    
    try {
      const customResponse = await axios.get(customEndpoint, {
        params: {
          api_key: apiKey
        },
        timeout: 15000, // 15 segundos de timeout
        validateStatus: () => true // Aceitar todos os status codes para capturar detalhes do erro
      });
      
      console.log(`[Wordfence] Resposta recebida - Status: ${customResponse.status}`);
      console.log(`[Wordfence] Dados recebidos:`, JSON.stringify(customResponse.data).substring(0, 200));

      if (customResponse.status === 200 && customResponse.data) {
        console.log('[Wordfence] ✅ Dados obtidos via endpoint customizado');
        console.log('[Wordfence] Resposta completa:', JSON.stringify(customResponse.data, null, 2));
        const parsed = parseWordfenceResponse(customResponse.data);
        console.log('[Wordfence] Dados parseados:', JSON.stringify(parsed, null, 2));
        if (parsed.success) {
          return parsed;
        } else {
          console.error('[Wordfence] ❌ Erro ao parsear resposta:', parsed.message);
        }
      } else if (customResponse.status === 401) {
        console.error('[Wordfence] ❌ API key inválida (401)');
        console.error('[Wordfence] Resposta:', JSON.stringify(customResponse.data, null, 2));
        return {
          success: false,
          message: 'API key inválida. Verifique a API key configurada no WordPress e no Artna Monitor.',
          needsSetup: false
        };
      } else if (customResponse.status === 404) {
        console.error('[Wordfence] ❌ Endpoint não encontrado (404)');
        console.error('[Wordfence] Resposta:', JSON.stringify(customResponse.data, null, 2));
        return {
          success: false,
          message: 'Endpoint customizado não encontrado. Instale o plugin Artna Monitor no WordPress do cliente.',
          needsSetup: true
        };
      } else if (customResponse.status === 500) {
        console.error('[Wordfence] ❌ Erro 500 no servidor WordPress');
        console.error('[Wordfence] Resposta completa:', JSON.stringify(customResponse.data, null, 2));
        console.error('[Wordfence] Headers:', JSON.stringify(customResponse.headers, null, 2));
        return {
          success: false,
          message: `Erro no servidor WordPress (500). Verifique os logs de erro do WordPress. Resposta: ${JSON.stringify(customResponse.data)}`,
          needsSetup: false,
          errorDetails: customResponse.data
        };
      } else {
        console.error(`[Wordfence] ❌ Status inesperado: ${customResponse.status}`);
        console.error(`[Wordfence] Resposta:`, JSON.stringify(customResponse.data, null, 2));
      }
    } catch (customError) {
      if (customError.code === 'ECONNREFUSED' || customError.code === 'ETIMEDOUT') {
        console.error(`[Wordfence] ❌ Erro de conexão: ${customError.code}`);
        return {
          success: false,
          message: `Não foi possível conectar ao site. Verifique se o site está online e acessível.`,
          needsSetup: false
        };
      }
      
      if (customError.response) {
        const status = customError.response.status;
        const responseData = customError.response.data;
        
        console.error(`[Wordfence] ❌ Erro HTTP ${status}`);
        console.error(`[Wordfence] Resposta do erro:`, JSON.stringify(responseData, null, 2));
        console.error(`[Wordfence] Headers do erro:`, JSON.stringify(customError.response.headers, null, 2));
        
        if (status === 401) {
          return {
            success: false,
            message: 'API key inválida. Verifique a API key configurada.',
            needsSetup: false,
            errorDetails: responseData
          };
        }
        if (status === 404) {
          return {
            success: false,
            message: 'Endpoint customizado não encontrado. Instale o plugin Artna Monitor no WordPress.',
            needsSetup: true,
            errorDetails: responseData
          };
        }
        if (status === 500) {
          return {
            success: false,
            message: `Erro no servidor WordPress (500). Verifique os logs de erro do WordPress. Detalhes: ${JSON.stringify(responseData)}`,
            needsSetup: false,
            errorDetails: responseData
          };
        }
      }
      
      console.error(`[Wordfence] ❌ Erro ao acessar endpoint: ${customError.message}`);
      console.error(`[Wordfence] Stack trace:`, customError.stack);
      return {
        success: false,
        message: `Erro ao acessar endpoint do Wordfence: ${customError.message}. Verifique se o endpoint customizado está instalado no WordPress.`,
        needsSetup: true,
        errorDetails: customError.response?.data || customError.message
      };
    }

    return {
      success: false,
      message: 'Não foi possível obter dados do Wordfence. Verifique a configuração.',
      needsSetup: true
    };

  } catch (error) {
    console.error('[Wordfence] Erro geral:', error.message);
    return {
      success: false,
      message: error.message,
      statusCode: error.response?.status || 500
    };
  }
}

/**
 * Parse da resposta do Wordfence
 */
function parseWordfenceResponse(data) {
  try {
    // Estrutura esperada da resposta do endpoint customizado
    const scanStatus = data.scan_status || data.status || 'unknown';
    const malwareDetected = data.malware_detected || false;
    const infectedFiles = data.infected_files || data.issues || [];
    const lastScan = data.last_scan || data.scan_date || new Date().toISOString();
    
    // Determinar status baseado na severidade dos problemas
    let status = 'clean';
    const criticalCount = data.critical_count || 0;
    const mediumCount = data.medium_count || 0;
    
    // Se há problemas CRÍTICOS (critical_count > 0), status é infected (vermelho)
    if (criticalCount > 0 || malwareDetected || (Array.isArray(infectedFiles) && infectedFiles.length > 0)) {
      status = 'infected';
    } 
    // Se há problemas MÉDIOS (medium_count > 0), status é warning (amarelo)
    else if (mediumCount > 0) {
      status = 'warning';
    }
    // Fallback para status retornado pelo plugin
    else if (scanStatus === 'warning' || scanStatus === 'warn') {
      status = 'warning';
    } else if (scanStatus === 'clean' || scanStatus === 'ok' || scanStatus === 'safe') {
      status = 'clean';
    }

    return {
      success: true,
      data: {
        scan_status: status,
        malware_detected: malwareDetected,
        infected_files: Array.isArray(infectedFiles) ? infectedFiles : [],
        last_scan: lastScan,
        scan_details: {
          total_files_scanned: data.total_files_scanned || data.files_scanned || 0,
          infected_files_count: Array.isArray(infectedFiles) ? infectedFiles.length : 0,
          warnings_count: data.warnings_count || (data.issues ? data.issues.length : 0),
          critical_count: data.critical_count || 0,
          medium_count: data.medium_count || 0,
          issues: data.issues || []
        },
        // Incluir contadores diretos também
        total_files_scanned: data.total_files_scanned || data.files_scanned || 0,
        critical_count: data.critical_count || 0,
        medium_count: data.medium_count || 0
      }
    };
  } catch (error) {
    console.error('[Wordfence] Erro ao parsear resposta:', error);
    return {
      success: false,
      message: 'Erro ao processar resposta do Wordfence: ' + error.message
    };
  }
}

/**
 * Determinar status baseado no resultado do Wordfence
 */
function determineWordfenceStatus(scanData) {
  if (!scanData || !scanData.data) {
    return 'unknown';
  }

  const data = scanData.data;

  // Se há malware detectado
  if (data.malware_detected === true || 
      (data.infected_files && data.infected_files.length > 0)) {
    return 'infected';
  }

  // Se há avisos
  if (data.scan_status === 'warning' || 
      (data.scan_details && data.scan_details.warnings_count > 0)) {
    return 'warning';
  }

  // Se está limpo
  if (data.scan_status === 'clean') {
    return 'clean';
  }

  return 'unknown';
}

/**
 * Combinar status do Sucuri (externo) com Wordfence (interno)
 * Prioridade: infected > warning > clean
 */
function combineStatus(sucuriStatus, wordfenceStatus) {
  // Se qualquer um detectar malware, status é infected
  if (sucuriStatus === 'infected' || wordfenceStatus === 'infected') {
    return 'infected';
  }

  // Se qualquer um tiver warning, status é warning
  if (sucuriStatus === 'warning' || wordfenceStatus === 'warning') {
    return 'warning';
  }

  // Se ambos estão clean, status é clean
  if (sucuriStatus === 'clean' && wordfenceStatus === 'clean') {
    return 'clean';
  }

  // Se um está clean e outro unknown, usar o clean
  if (sucuriStatus === 'clean' && wordfenceStatus === 'unknown') {
    return 'clean';
  }
  if (sucuriStatus === 'unknown' && wordfenceStatus === 'clean') {
    return 'clean';
  }

  // Caso padrão
  return sucuriStatus || wordfenceStatus || 'unknown';
}

module.exports = {
  checkWordfenceScan,
  determineWordfenceStatus,
  combineStatus
};
