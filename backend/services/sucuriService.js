/**
 * Sucuri API Service
 */

const axios = require('axios');

const SUCURI_API_URL = process.env.SUCURI_API_URL || 'https://sitecheck.sucuri.net/api/v3/';

/**
 * Escanear site via API Sucuri
 */
async function scanSite(domain) {
  try {
    const url = `${SUCURI_API_URL}?scan=${encodeURIComponent(domain)}`;
    
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'ArtnaWEB Monitor/1.0'
      }
    });

    return {
      success: true,
      data: response.data,
      statusCode: response.status
    };

  } catch (error) {
    console.error('Sucuri API error:', error.message);
    return {
      success: false,
      message: error.message,
      statusCode: error.response?.status || 500
    };
  }
}

/**
 * Determinar status baseado na resposta da API
 */
function determineStatus(apiData) {
  if (!apiData || typeof apiData !== 'object') {
    return 'unknown';
  }

  let status = 'unknown';

  // PRIORIDADE 1: Verificar malware
  if (apiData.malware && 
      ((Array.isArray(apiData.malware) && apiData.malware.length > 0) ||
       (typeof apiData.malware === 'string' && apiData.malware.trim() !== '') ||
       (apiData.malware !== null && apiData.malware !== false))) {
    return 'infected';
  }

  // Verificar malware na estrutura antiga
  if (apiData.sitecheck?.malware) {
    const malware = apiData.sitecheck.malware;
    if ((Array.isArray(malware) && malware.length > 0) ||
        (typeof malware === 'string' && malware.trim() !== '')) {
      return 'infected';
    }
  }

  // PRIORIDADE 2: Verificar blacklisted (antes dos warnings)
  if (apiData.blacklisted === true) {
    return 'infected';
  }

  // PRIORIDADE 3: Verificar warnings/avisos
  // Se houver avisos, status deve ser "warning" (amarelo)
  if (apiData.warnings && typeof apiData.warnings === 'object') {
    // Verificar se há qualquer warning presente
    let hasWarnings = false;
    for (const warningType in apiData.warnings) {
      const warnings = apiData.warnings[warningType];
      if (Array.isArray(warnings) && warnings.length > 0) {
        hasWarnings = true;
        break;
      } else if (warnings && typeof warnings === 'object' && Object.keys(warnings).length > 0) {
        hasWarnings = true;
        break;
      }
    }
    if (hasWarnings) {
      status = 'warning';
    }
  }

  // Verificar warnings na estrutura antiga
  if (status !== 'warning' && apiData.sitecheck?.warnings) {
    const warnings = apiData.sitecheck.warnings;
    if ((Array.isArray(warnings) && warnings.length > 0) ||
        (typeof warnings === 'object' && Object.keys(warnings).length > 0)) {
      status = 'warning';
    }
  }

  // PRIORIDADE 4: Verificar status direto da API (estrutura antiga)
  // Se a API retornar um status explícito, usar esse status (mas não sobrescrever warning se já definido)
  if (status === 'unknown' && apiData.sitecheck?.status) {
    const apiStatus = apiData.sitecheck.status.toLowerCase().trim();
    if (apiStatus === 'infected' || apiStatus === 'malware' || apiStatus === 'blacklisted') {
      status = 'infected';
    } else if (apiStatus === 'clean' || apiStatus === 'safe' || apiStatus === 'ok') {
      // Só definir como clean se não houver warnings
      if (status === 'unknown') {
        status = 'clean';
      }
    } else if (apiStatus === 'warning' || apiStatus === 'warn' || apiStatus === 'suspicious') {
      status = 'warning';
    }
  }

  // FALLBACK: Lógica final
  // Se ainda não determinamos o status, verificar condições críticas
  if (status === 'unknown') {
    // Verificar se há malware (double-check)
    const hasMalware = apiData.malware && 
                      ((Array.isArray(apiData.malware) && apiData.malware.length > 0) ||
                       (typeof apiData.malware === 'string' && apiData.malware.trim() !== '') ||
                       (apiData.sitecheck?.malware && 
                        ((Array.isArray(apiData.sitecheck.malware) && apiData.sitecheck.malware.length > 0) ||
                         (typeof apiData.sitecheck.malware === 'string' && apiData.sitecheck.malware.trim() !== ''))));

    // Verificar se está blacklisted (double-check)
    const isBlacklisted = apiData.blacklisted === true || 
                         apiData.sitecheck?.status?.toLowerCase().includes('blacklisted');

    // Verificar se há warnings (double-check)
    const hasWarnings = (apiData.warnings && typeof apiData.warnings === 'object' && Object.keys(apiData.warnings).length > 0) ||
                        (apiData.sitecheck?.warnings && 
                         ((Array.isArray(apiData.sitecheck.warnings) && apiData.sitecheck.warnings.length > 0) ||
                          (typeof apiData.sitecheck.warnings === 'object' && Object.keys(apiData.sitecheck.warnings).length > 0)));

    if (hasMalware || isBlacklisted) {
      status = 'infected';
    } else if (hasWarnings) {
      status = 'warning';
    } else {
      // Se não há malware, não está blacklisted e não há warnings, status é "clean"
      status = 'clean';
    }
  }

  return status;
}

/**
 * Obter texto do status
 */
function getStatusText(status) {
  const statusMap = {
    'clean': 'Verificado',
    'warning': 'Verificar',
    'infected': 'Infectado',
    'unknown': 'Desconhecido'
  };
  return statusMap[status] || 'Desconhecido';
}

module.exports = {
  scanSite,
  determineStatus,
  getStatusText
};

