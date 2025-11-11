/**
 * Parse scan details from Sucuri API response
 */

function parseScanDetails(apiData) {
  if (!apiData || typeof apiData !== 'object') {
    return {
      categories: [],
      overallStatus: 'unknown',
      summary: 'Nenhum dado disponível'
    };
  }

  const categories = [];
  let overallStatus = 'clean';

  // 1. Malware Detection
  const malwareStatus = getMalwareStatus(apiData);
  categories.push({
    name: 'Malware',
    status: malwareStatus.status,
    description: malwareStatus.description,
    items: malwareStatus.items
  });
  if (malwareStatus.status === 'infected') overallStatus = 'infected';

  // 2. Blacklist Status
  const blacklistStatus = getBlacklistStatus(apiData);
  categories.push({
    name: 'Blacklist',
    status: blacklistStatus.status,
    description: blacklistStatus.description,
    items: blacklistStatus.items
  });
  if (blacklistStatus.status === 'infected' && overallStatus !== 'infected') {
    overallStatus = 'infected';
  } else if (blacklistStatus.status === 'warning' && overallStatus === 'clean') {
    overallStatus = 'warning';
  }

  // 3. SSL Certificate
  const sslStatus = getSSLStatus(apiData);
  categories.push({
    name: 'Certificado SSL',
    status: sslStatus.status,
    description: sslStatus.description,
    items: sslStatus.items
  });
  if (sslStatus.status === 'warning' && overallStatus === 'clean') {
    overallStatus = 'warning';
  }

  // 4. Security Headers
  const headersStatus = getSecurityHeadersStatus(apiData);
  categories.push({
    name: 'Headers de Segurança',
    status: headersStatus.status,
    description: headersStatus.description,
    items: headersStatus.items
  });
  if (headersStatus.status === 'warning' && overallStatus === 'clean') {
    overallStatus = 'warning';
  }

  // 5. Security Rating - REMOVIDO: Não estamos mais usando classificação de segurança para determinar status
  // A categoria foi removida da interface pois não é mais relevante para a determinação do status

  // 6. Warnings
  const warningsStatus = getWarningsStatus(apiData);
  if (warningsStatus.items.length > 0) {
    categories.push({
      name: 'Avisos',
      status: warningsStatus.status,
      description: warningsStatus.description,
      items: warningsStatus.items
    });
    if (warningsStatus.status === 'warning' && overallStatus === 'clean') {
      overallStatus = 'warning';
    }
  }

  // 7. Domain Information
  const domainStatus = getDomainStatus(apiData);
  categories.push({
    name: 'Informações do Domínio',
    status: domainStatus.status,
    description: domainStatus.description,
    items: domainStatus.items
  });

  return {
    categories,
    overallStatus,
    summary: getSummary(apiData, overallStatus)
  };
}

function getMalwareStatus(apiData) {
  const items = [];
  
  // Check malware field
  if (apiData.malware) {
    if (Array.isArray(apiData.malware) && apiData.malware.length > 0) {
      items.push({
        label: 'Malware Detectado',
        value: apiData.malware.join(', '),
        status: 'infected'
      });
      return {
        status: 'infected',
        description: 'Malware foi detectado no site',
        items
      };
    } else if (typeof apiData.malware === 'string' && apiData.malware.trim() !== '') {
      items.push({
        label: 'Malware Detectado',
        value: apiData.malware,
        status: 'infected'
      });
      return {
        status: 'infected',
        description: 'Malware foi detectado no site',
        items
      };
    }
  }

  // Check sitecheck.malware
  if (apiData.sitecheck?.malware) {
    const malware = apiData.sitecheck.malware;
    if (Array.isArray(malware) && malware.length > 0) {
      items.push({
        label: 'Malware Detectado',
        value: malware.join(', '),
        status: 'infected'
      });
      return {
        status: 'infected',
        description: 'Malware foi detectado no site',
        items
      };
    } else if (typeof malware === 'string' && malware.trim() !== '') {
      items.push({
        label: 'Malware Detectado',
        value: malware,
        status: 'infected'
      });
      return {
        status: 'infected',
        description: 'Malware foi detectado no site',
        items
      };
    }
  }

  items.push({
    label: 'Status',
    value: 'Nenhum malware detectado',
    status: 'clean'
  });

  return {
    status: 'clean',
    description: 'Nenhum malware foi detectado',
    items
  };
}

function getBlacklistStatus(apiData) {
  const items = [];
  
  if (apiData.blacklisted === true) {
    items.push({
      label: 'Status',
      value: 'Site está na blacklist',
      status: 'infected'
    });
    if (apiData.blacklisted_details) {
      items.push({
        label: 'Detalhes',
        value: typeof apiData.blacklisted_details === 'string' 
          ? apiData.blacklisted_details 
          : JSON.stringify(apiData.blacklisted_details),
        status: 'infected'
      });
    }
    return {
      status: 'infected',
      description: 'Site está listado em blacklists de segurança',
      items
    };
  }

  items.push({
    label: 'Status',
    value: 'Site não está na blacklist',
    status: 'clean'
  });

  return {
    status: 'clean',
    description: 'Site não está listado em blacklists',
    items
  };
}

function getSSLStatus(apiData) {
  const items = [];
  
  if (apiData.ssl) {
    if (apiData.ssl.valid === false) {
      items.push({
        label: 'Status',
        value: 'Certificado SSL inválido ou expirado',
        status: 'warning'
      });
      if (apiData.ssl.error) {
        items.push({
          label: 'Erro',
          value: apiData.ssl.error,
          status: 'warning'
        });
      }
      return {
        status: 'warning',
        description: 'Problemas com o certificado SSL',
        items
      };
    } else if (apiData.ssl.valid === true) {
      items.push({
        label: 'Status',
        value: 'Certificado SSL válido',
        status: 'clean'
      });
      if (apiData.ssl.issuer) {
        items.push({
          label: 'Emissor',
          value: apiData.ssl.issuer,
          status: 'clean'
        });
      }
      if (apiData.ssl.expires) {
        items.push({
          label: 'Validade',
          value: apiData.ssl.expires,
          status: 'clean'
        });
      }
      return {
        status: 'clean',
        description: 'Certificado SSL válido',
        items
      };
    }
  }

  items.push({
    label: 'Status',
    value: 'Informações SSL não disponíveis',
    status: 'unknown'
  });

  return {
    status: 'unknown',
    description: 'Não foi possível verificar o certificado SSL',
    items
  };
}

function getSecurityHeadersStatus(apiData) {
  const items = [];
  
  if (apiData.headers) {
    const requiredHeaders = [
      'X-Frame-Options',
      'X-Content-Type-Options',
      'X-XSS-Protection',
      'Strict-Transport-Security',
      'Content-Security-Policy'
    ];

    let hasIssues = false;
    const missingHeaders = [];

    requiredHeaders.forEach(header => {
      if (!apiData.headers[header]) {
        missingHeaders.push(header);
        hasIssues = true;
      } else {
        items.push({
          label: header,
          value: apiData.headers[header],
          status: 'clean'
        });
      }
    });

    missingHeaders.forEach(header => {
      items.push({
        label: header,
        value: 'Não configurado',
        status: 'warning'
      });
    });

    if (hasIssues) {
      return {
        status: 'warning',
        description: 'Alguns headers de segurança estão faltando',
        items
      };
    }

    return {
      status: 'clean',
      description: 'Todos os headers de segurança estão configurados',
      items
    };
  }

  items.push({
    label: 'Status',
    value: 'Informações de headers não disponíveis',
    status: 'unknown'
  });

  return {
    status: 'unknown',
    description: 'Não foi possível verificar os headers de segurança',
    items
  };
}

function getSecurityRatingStatus(apiData) {
  const items = [];
  
  if (apiData.ratings) {
    // Security Rating
    if (apiData.ratings.security && apiData.ratings.security.rating) {
      const rating = apiData.ratings.security.rating.toUpperCase().trim();
      const score = apiData.ratings.security.score;
      
      let status = 'clean';
      let description = '';
      if (rating === 'F' || rating === 'D') {
        status = 'infected';
        description = rating === 'F' ? 'Crítico - Segurança muito comprometida' : 'Ruim - Segurança comprometida';
      } else if (rating === 'A') {
        status = 'clean';
        description = 'Excelente - Segurança adequada';
      } else if (rating === 'B') {
        status = 'warning';
        description = 'Bom - Pequenos problemas de segurança';
      } else if (rating === 'C') {
        status = 'warning';
        description = 'Médio - Segurança abaixo do ideal';
      } else {
        status = 'warning';
        description = 'Atenção necessária';
      }

      // Formatar valor: mostrar score apenas se existir
      let displayValue = rating;
      if (score !== null && score !== undefined && score !== 'N/A' && score !== '') {
        displayValue = `${rating} (${score})`;
      }

      items.push({
        label: 'Classificação de Segurança',
        value: displayValue,
        description: description,
        status
      });
    }

    // Total Rating
    if (apiData.ratings.total && apiData.ratings.total.rating) {
      const rating = apiData.ratings.total.rating.toUpperCase().trim();
      const score = apiData.ratings.total.score;
      
      let status = 'clean';
      let description = '';
      if (rating === 'F' || rating === 'D') {
        status = 'infected';
        description = rating === 'F' ? 'Crítico - Classificação muito baixa' : 'Ruim - Classificação baixa';
      } else if (rating === 'A') {
        status = 'clean';
        description = 'Excelente - Classificação adequada';
      } else if (rating === 'B') {
        status = 'warning';
        description = 'Bom - Classificação aceitável';
      } else if (rating === 'C') {
        status = 'warning';
        description = 'Médio - Classificação abaixo do ideal';
      } else {
        status = 'warning';
        description = 'Atenção necessária';
      }

      // Formatar valor: mostrar score apenas se existir
      let displayValue = rating;
      if (score !== null && score !== undefined && score !== 'N/A' && score !== '') {
        displayValue = `${rating} (${score})`;
      }

      items.push({
        label: 'Classificação Total',
        value: displayValue,
        description: description,
        status
      });
    }

    if (items.length > 0) {
      const hasInfected = items.some(item => item.status === 'infected');
      const hasWarning = items.some(item => item.status === 'warning');
      
      return {
        status: hasInfected ? 'infected' : (hasWarning ? 'warning' : 'clean'),
        description: hasInfected 
          ? 'Classificação de segurança muito baixa'
          : (hasWarning 
            ? 'Classificação de segurança abaixo do ideal'
            : 'Classificação de segurança excelente'),
        items
      };
    }
  }

  items.push({
    label: 'Status',
    value: 'Classificação não disponível',
    status: 'unknown'
  });

  return {
    status: 'unknown',
    description: 'Não foi possível obter a classificação de segurança',
    items
  };
}

function cleanText(text) {
  if (!text) return '';
  
  // Remover HTML tags
  text = text.replace(/<[^>]*>/g, '');
  
  // Remover entidades HTML
  text = text.replace(/&nbsp;/g, ' ')
             .replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&quot;/g, '"')
             .replace(/&#39;/g, "'");
  
  // Remover caracteres de controle e quebras de linha múltiplas
  text = text.replace(/[\r\n]+/g, ' ')
             .replace(/\s+/g, ' ')
             .trim();
  
  // Remover URLs muito longas (substituir por "...")
  text = text.replace(/https?:\/\/[^\s]{50,}/g, (url) => {
    return url.substring(0, 40) + '...';
  });
  
  return text;
}

function formatWarningMessage(warning) {
  if (typeof warning === 'string') {
    return cleanText(warning);
  }
  
  if (typeof warning !== 'object' || warning === null) {
    return '';
  }

  // Extrair mensagem principal
  let message = '';
  if (warning.msg) {
    message = cleanText(warning.msg);
  } else if (warning.message) {
    message = cleanText(warning.message);
  } else if (warning.text) {
    message = cleanText(warning.text);
  } else if (warning.description) {
    message = cleanText(warning.description);
  }

  // Se não há mensagem, tentar construir a partir de outros campos
  if (!message) {
    if (warning.type) {
      const typeLabel = cleanText(warning.type);
      message = typeLabel;
      
      // Adicionar detalhes se disponíveis e não muito longos
      if (warning.details) {
        let details = '';
        if (typeof warning.details === 'string') {
          details = cleanText(warning.details);
        } else {
          // Se details é um objeto, pegar valores relevantes
          const detailParts = [];
          if (warning.details.path) detailParts.push(warning.details.path);
          if (warning.details.file) detailParts.push(warning.details.file);
          if (warning.details.reason) detailParts.push(warning.details.reason);
          details = detailParts.join(' - ');
        }
        
        if (details && details.length > 0 && details.length < 150) {
          message += ': ' + details;
        }
      }
    } else {
      // Tentar extrair informações úteis do objeto
      const usefulFields = [];
      
      // Ignorar campos técnicos que não são úteis para o usuário
      const ignoreFields = ['info_url', 'url', 'details', 'id', 'timestamp', 'hash'];
      
      Object.keys(warning).forEach(key => {
        if (!ignoreFields.includes(key) && typeof warning[key] === 'string' && warning[key].trim()) {
          const value = cleanText(warning[key]);
          if (value && value.length < 100) {
            usefulFields.push(value);
          }
        }
      });
      
      if (usefulFields.length > 0) {
        message = usefulFields[0];
        if (usefulFields.length > 1 && usefulFields[1].length < 50) {
          message += ' - ' + usefulFields[1];
        }
      }
    }
  }

  // Limitar tamanho da mensagem e garantir que seja legível
  if (message.length > 250) {
    message = message.substring(0, 250).trim();
    // Tentar cortar em um ponto que faça sentido (ponto final, vírgula, etc)
    const lastPeriod = message.lastIndexOf('.');
    const lastComma = message.lastIndexOf(',');
    const cutPoint = Math.max(lastPeriod, lastComma);
    if (cutPoint > 150) {
      message = message.substring(0, cutPoint + 1);
    } else {
      message += '...';
    }
  }

  return message || 'Aviso detectado';
}

function getWarningTypeLabel(key) {
  const typeMap = {
    'site_issue': 'Problema no Site',
    'security_issue': 'Problema de Segurança',
    'performance_issue': 'Problema de Performance',
    'ssl_issue': 'Problema SSL',
    'blacklist': 'Blacklist',
    'malware': 'Malware',
    'phishing': 'Phishing',
    'spam': 'Spam'
  };
  return typeMap[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
}

function getWarningsStatus(apiData) {
  const items = [];
  
  if (apiData.warnings && typeof apiData.warnings === 'object') {
    Object.keys(apiData.warnings).forEach(key => {
      const warning = apiData.warnings[key];
      if (Array.isArray(warning) && warning.length > 0) {
        warning.forEach(w => {
          const formattedMessage = formatWarningMessage(w);
          if (formattedMessage) {
            items.push({
              label: getWarningTypeLabel(key),
              value: formattedMessage,
              status: 'warning'
            });
          }
        });
      } else if (warning && typeof warning === 'object' && Object.keys(warning).length > 0) {
        const formattedMessage = formatWarningMessage(warning);
        if (formattedMessage) {
          items.push({
            label: getWarningTypeLabel(key),
            value: formattedMessage,
            status: 'warning'
          });
        }
      } else if (warning && typeof warning === 'string' && warning.trim() !== '') {
        const formattedMessage = formatWarningMessage(warning);
        if (formattedMessage) {
          items.push({
            label: getWarningTypeLabel(key),
            value: formattedMessage,
            status: 'warning'
          });
        }
      }
    });
  }

  if (apiData.sitecheck?.warnings) {
    const warnings = apiData.sitecheck.warnings;
    if (Array.isArray(warnings) && warnings.length > 0) {
      warnings.forEach(w => {
        const formattedMessage = formatWarningMessage(w);
        if (formattedMessage) {
          items.push({
            label: 'Aviso',
            value: formattedMessage,
            status: 'warning'
          });
        }
      });
    }
  }

  if (items.length > 0) {
    return {
      status: 'warning',
      description: `${items.length} aviso(s) encontrado(s)`,
      items
    };
  }

  return {
    status: 'clean',
    description: 'Nenhum aviso encontrado',
    items
  };
}

function getDomainStatus(apiData) {
  const items = [];
  
  if (apiData.domain) {
    items.push({
      label: 'Domínio',
      value: apiData.domain,
      status: 'clean'
    });
  }

  if (apiData.ip) {
    items.push({
      label: 'IP',
      value: apiData.ip,
      status: 'clean'
    });
  }

  if (apiData.server) {
    items.push({
      label: 'Servidor',
      value: apiData.server,
      status: 'clean'
    });
  }

  if (apiData.cms) {
    items.push({
      label: 'CMS',
      value: apiData.cms,
      status: 'clean'
    });
  }

  return {
    status: 'clean',
    description: 'Informações do domínio',
    items
  };
}

function getSummary(apiData, overallStatus) {
  if (overallStatus === 'infected') {
    return 'ALERTA CRÍTICO: O site apresenta problemas graves de segurança que requerem ação imediata.';
  } else if (overallStatus === 'warning') {
    return 'ATENÇÃO: O site apresenta alguns problemas de segurança que devem ser corrigidos.';
  } else if (overallStatus === 'clean') {
    return 'O site está seguro. Nenhum problema crítico foi detectado.';
  } else {
    return 'Não foi possível determinar o status completo do site.';
  }
}

module.exports = {
  parseScanDetails
};

