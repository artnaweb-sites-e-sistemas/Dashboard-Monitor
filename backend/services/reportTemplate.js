/**
 * Template de Relatório Profissional
 * Foco em valor do serviço, tranquilidade e informações úteis
 * Copy positiva que demonstra o monitoramento ativo
 */

function getProfessionalReportTemplate() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6; 
      color: #333; 
      background: #f5f5f5;
      padding: 20px;
    }
    .email-container { 
      max-width: 800px; 
      margin: 0 auto; 
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; 
      padding: 40px 30px; 
      text-align: center;
    }
    .header h1 { 
      font-size: 28px; 
      margin-bottom: 10px;
      font-weight: 700;
    }
    .header p {
      font-size: 16px;
      opacity: 0.95;
    }
    .content { 
      padding: 30px; 
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
      color: #333;
    }
    .intro {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      padding: 25px;
      border-radius: 8px;
      margin-bottom: 30px;
      border-left: 4px solid #667eea;
    }
    .intro h2 {
      font-size: 20px;
      color: #667eea;
      margin-bottom: 12px;
    }
    .intro p {
      margin: 8px 0;
      color: #555;
      line-height: 1.8;
    }
    .intro .highlight {
      color: #667eea;
      font-weight: 600;
    }
    .value-proposition {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 25px;
      border: 2px solid #e9ecef;
    }
    .value-proposition h3 {
      color: #667eea;
      font-size: 16px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .value-proposition ul {
      margin-left: 20px;
      color: #555;
    }
    .value-proposition li {
      margin: 8px 0;
      line-height: 1.6;
    }
    .site-section {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 25px;
      margin-bottom: 25px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .site-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #f0f0f0;
    }
    .site-header h2 {
      font-size: 22px;
      color: #333;
      margin: 0;
    }
    .status-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
    }
    .status-clean { background: #d1fae5; color: #065f46; }
    .status-warning { background: #fef3c7; color: #92400e; }
    .status-infected { background: #fef3c7; color: #92400e; }
    .status-unknown { background: #e5e7eb; color: #374151; }
    .status-online { background: #d1fae5; color: #065f46; }
    .status-offline { background: #fef3c7; color: #92400e; }
    .status-paused { background: #fef3c7; color: #92400e; }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .metric-card {
      background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
      padding: 18px;
      border-radius: 8px;
      text-align: center;
      border: 1px solid #e0e0e0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.03);
    }
    .metric-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .metric-value {
      font-size: 24px;
      font-weight: 700;
      color: #333;
    }
    .metric-value.good { color: #059669; }
    .metric-value.warning { color: #d97706; }
    .metric-value.bad { color: #d97706; }
    
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin: 25px 0 15px 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #f0f0f0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
      margin: 15px 0;
    }
    .info-item {
      padding: 15px;
      background: #f8f9fa;
      border-radius: 6px;
      border-left: 3px solid #667eea;
    }
    .info-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .info-value {
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }
    .info-description {
      font-size: 13px;
      color: #666;
      margin-top: 5px;
    }
    
    .technical-info {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      margin: 15px 0;
      border-left: 4px solid #667eea;
    }
    .technical-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin-top: 12px;
    }
    .technical-item {
      padding: 10px;
      background: white;
      border-radius: 6px;
      border: 1px solid #e0e0e0;
    }
    .technical-label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .technical-value {
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }
    
    .category-section {
      margin: 20px 0;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }
    .category-title {
      font-size: 16px;
      font-weight: 600;
      color: #333;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .category-status {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    .category-description {
      color: #555;
      margin: 8px 0;
      font-size: 14px;
    }
    .category-items {
      margin-top: 10px;
      padding-left: 20px;
    }
    .category-item {
      margin: 5px 0;
      font-size: 14px;
      color: #666;
    }
    .category-item strong {
      color: #333;
    }
    
    .alert-box {
      padding: 18px;
      border-radius: 8px;
      margin: 15px 0;
      border-left: 4px solid;
      line-height: 1.8;
    }
    .alert-success {
      background: #d1fae5;
      border-color: #059669;
      color: #065f46;
    }
    .alert-warning {
      background: #fef3c7;
      border-color: #d97706;
      color: #92400e;
    }
    .alert-info {
      background: #dbeafe;
      border-color: #3b82f6;
      color: #1e40af;
    }
    
    .monitoring-active {
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      padding: 15px;
      border-radius: 8px;
      margin: 15px 0;
      border-left: 4px solid #059669;
    }
    .monitoring-active .text {
      color: #065f46;
      font-weight: 600;
    }
    
    .recommendations {
      background: #fff7ed;
      padding: 18px;
      border-radius: 8px;
      margin: 15px 0;
      border-left: 4px solid #f59e0b;
    }
    .recommendations h4 {
      color: #92400e;
      margin-bottom: 10px;
      font-size: 16px;
    }
    .recommendations ul {
      margin-left: 20px;
      color: #92400e;
    }
    .recommendations li {
      margin: 8px 0;
      line-height: 1.6;
    }
    
    .footer { 
      background: #f8f9fa;
      padding: 25px 30px; 
      text-align: center;
      border-top: 1px solid #e0e0e0;
      color: #666;
      font-size: 14px;
    }
    .footer p {
      margin: 5px 0;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    .footer .contact-info {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #e0e0e0;
      font-size: 13px;
    }
    
    @media (max-width: 600px) {
      .metrics-grid, .info-grid, .technical-grid {
        grid-template-columns: 1fr;
      }
      .site-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>Relatório de Monitoramento</h1>
      <p>ArtnaWEB Monitor - Monitoramento de Segurança e Disponibilidade</p>
    </div>
    
    <div class="content">
      <div class="greeting">
        Olá <strong>{{clientName}}</strong>,
      </div>
      
      <div class="intro">
        <h2>Relatório de Monitoramento</h2>
        <p>Relatório de monitoramento de segurança e disponibilidade do seu site.</p>
        <p style="margin-top: 15px; color: #667eea; font-weight: 600; font-size: 15px;">Data: {{reportDate}}</p>
      </div>
      
      <div class="value-proposition">
        <h3>Serviços Incluídos:</h3>
        <ul>
          <li><strong>Verificação de Segurança:</strong> Varreduras regulares de segurança</li>
          <li><strong>Monitoramento de Disponibilidade:</strong> Verificação contínua do status</li>
          <li><strong>Detecção de Problemas:</strong> Identificação proativa de questões</li>
          <li><strong>Manutenção Preventiva:</strong> Acompanhamento técnico contínuo</li>
        </ul>
      </div>
      
      {{sitesList}}
      
      <div class="footer">
        <p><strong>ArtnaWEB Monitor</strong></p>
        <p>Monitoramento contínuo de segurança e disponibilidade</p>
        <div class="contact-info">
          <p>Este é um relatório automático do sistema de monitoramento.</p>
          <p>Para dúvidas ou suporte, entre em contato conosco.</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function formatSiteCardProfessional(site, scanDetails, uptimeData) {
  // Determinar status text e classe baseado no status real
  // Sempre apresentar de forma positiva, ocultando informações preocupantes
  const isClean = site.last_status === 'clean';
  
  const statusText = isClean ? 'Seguro' : 'Monitorando';
  const statusClass = isClean ? 'status-clean' : 'status-warning';
  
  // Formatação de datas
  const scanDate = site.last_scan 
    ? new Date(site.last_scan).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Aguardando primeira varredura';
  
  const uptimeLastCheck = site.uptime_last_check
    ? new Date(site.uptime_last_check).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : null;
  
  // Status de uptime - sempre apresentar de forma positiva quando não for clean
  const uptimeStatusText = {
    'up': 'Online',
    'down': 'Verificando',
    'paused': 'Verificando'
  }[site.uptime_status] || 'Monitorando';

  // Para sites não limpos, sempre usar classe positiva (verde) para uptime
  const uptimeStatusClass = isClean 
    ? ({
        'up': 'status-online',
        'down': 'status-warning',
        'paused': 'status-warning'
      }[site.uptime_status] || 'status-unknown')
    : 'status-online'; // Sempre mostrar como online para sites não limpos (ocultar problemas)
  
  // Uptime ratio formatado - sempre positivo quando não for clean
  const uptimeRatio = isClean
    ? (site.uptime_uptime_ratio 
        ? parseFloat(site.uptime_uptime_ratio).toFixed(2) + '%'
        : 'Monitorando...')
    : (site.uptime_uptime_ratio && parseFloat(site.uptime_uptime_ratio) >= 95
        ? parseFloat(site.uptime_uptime_ratio).toFixed(2) + '%'
        : 'Monitorando...'); // Se uptime for baixo, mostrar genérico

  // Response time formatado - sempre positivo quando não for clean
  const responseTime = isClean
    ? (site.uptime_response_time
        ? parseInt(site.uptime_response_time) + 'ms'
        : 'Verificando...')
    : (site.uptime_response_time && parseInt(site.uptime_response_time) < 2000
        ? parseInt(site.uptime_response_time) + 'ms'
        : 'Verificando...'); // Se response time for alto, mostrar genérico
  
  // Classificação de segurança
  let securityRating = 'N/A';
  let securityScore = null;
  if (scanDetails && scanDetails.categories) {
    const ratingCategory = scanDetails.categories.find(cat => 
      cat.name === 'Classificação de Segurança' || cat.name === 'Security Rating'
    );
    if (ratingCategory && ratingCategory.items && ratingCategory.items.length > 0) {
      const ratingItem = ratingCategory.items[0];
      securityRating = ratingItem.value || 'N/A';
      if (ratingItem.description) {
        securityScore = ratingItem.description;
      }
    }
  }
  
  // SSL Status - detalhes completos
  let sslStatus = 'Monitorando';
  let sslValid = false;
  let sslIssuer = null;
  let sslExpires = null;
  let sslDaysUntilExpiry = null;
  
  if (scanDetails && scanDetails.categories) {
    const sslCategory = scanDetails.categories.find(cat => 
      cat.name === 'Certificado SSL' || cat.name === 'SSL Certificate'
    );
    if (sslCategory) {
      sslStatus = sslCategory.description || 'Monitorando';
      sslValid = sslCategory.status === 'clean';
      
      if (sslCategory.items && sslCategory.items.length > 0) {
        const statusItem = sslCategory.items.find(item => item.label === 'Status');
        if (statusItem) {
          sslStatus = statusItem.value;
        }
        
        const issuerItem = sslCategory.items.find(item => item.label === 'Emissor');
        if (issuerItem) {
          sslIssuer = issuerItem.value;
        }
        
        const expiresItem = sslCategory.items.find(item => item.label === 'Validade');
        if (expiresItem) {
          sslExpires = expiresItem.value;
          // Tentar calcular dias até expiração
          try {
            const expiryDate = new Date(expiresItem.value);
            const now = new Date();
            const diffTime = expiryDate - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays > 0) {
              sslDaysUntilExpiry = diffDays;
            }
          } catch (e) {
            // Ignorar erro de parsing de data
          }
        }
      }
    }
  }
  
  // Malware e Blacklist - sempre apresentar de forma positiva
  // Se não for clean, ocultar informações preocupantes e mostrar mensagens genéricas
  let malwareStatus = 'Nenhum malware detectado';
  let blacklistStatus = 'Não listado em blacklists';
  
  if (!isClean && scanDetails && scanDetails.categories) {
    // Para sites não limpos, verificar se há problemas mas sempre apresentar de forma positiva
    const malwareCategory = scanDetails.categories.find(cat => 
      cat.name === 'Malware' || cat.name === 'Malware Detection'
    );
    const blacklistCategory = scanDetails.categories.find(cat => 
      cat.name === 'Blacklist' || cat.name === 'Blacklist Status'
    );
    
    // Se houver malware ou blacklist, usar mensagens genéricas positivas
    if (malwareCategory && malwareCategory.status === 'infected') {
      malwareStatus = 'Monitoramento ativo - verificações em andamento';
    }
    
    if (blacklistCategory && blacklistCategory.status === 'infected') {
      blacklistStatus = 'Monitoramento ativo - verificações em andamento';
    }
  }
  
  // Headers de segurança - mostrar todos
  let securityHeadersCount = 0;
  let securityHeadersTotal = 5;
  let securityHeadersList = [];
  if (scanDetails && scanDetails.categories) {
    const headersCategory = scanDetails.categories.find(cat => 
      cat.name === 'Headers de Segurança' || cat.name === 'Security Headers'
    );
    if (headersCategory && headersCategory.items) {
      securityHeadersCount = headersCategory.items.filter(item => item.status === 'clean').length;
      securityHeadersList = headersCategory.items.map(item => ({
        name: item.label,
        value: item.value,
        status: item.status
      }));
    }
  }
  
  // Informações técnicas do domínio
  let domainInfo = null;
  if (scanDetails && scanDetails.categories) {
    const domainCategory = scanDetails.categories.find(cat => 
      cat.name === 'Informações do Domínio' || cat.name === 'Domain Information'
    );
    if (domainCategory && domainCategory.items) {
      domainInfo = {};
      domainCategory.items.forEach(item => {
        if (item.label === 'IP') domainInfo.ip = item.value;
        if (item.label === 'Servidor') domainInfo.server = item.value;
        if (item.label === 'CMS') domainInfo.cms = item.value;
        if (item.label === 'Domínio') domainInfo.domain = item.value;
      });
    }
  }
  
  // Avisos - apresentar como recomendações, não como problemas
  let warningsCount = 0;
  let warningsList = [];
  if (scanDetails && scanDetails.categories) {
    const warningsCategory = scanDetails.categories.find(cat => 
      cat.name === 'Avisos' || cat.name === 'Warnings'
    );
    if (warningsCategory && warningsCategory.items) {
      warningsCount = warningsCategory.items.length;
      warningsList = warningsCategory.items.slice(0, 5);
    }
  }
  
  // Determinar classe de uptime ratio - sempre positivo
  const uptimeRatioClass = site.uptime_uptime_ratio 
    ? (parseFloat(site.uptime_uptime_ratio) >= 99.9 ? 'good' : 
       parseFloat(site.uptime_uptime_ratio) >= 99.0 ? 'good' : 'warning')
    : '';
  
  // Determinar classe de response time
  const responseTimeClass = site.uptime_response_time
    ? (parseInt(site.uptime_response_time) < 500 ? 'good' : 
       parseInt(site.uptime_response_time) < 1000 ? 'good' : 'warning')
    : '';
  
  // Calcular tempo de monitoramento
  let monitoringSince = null;
  if (site.created_at) {
    try {
      const createdDate = new Date(site.created_at);
      const now = new Date();
      const diffTime = now - createdDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        monitoringSince = diffDays === 1 ? '1 dia' : `${diffDays} dias`;
      }
    } catch (e) {
      // Ignorar erro
    }
  }
  
  return `
    <div class="site-section">
      <div class="site-header">
        <h2>${site.domain}</h2>
        <span class="status-badge ${statusClass}">${statusText}</span>
      </div>
      
      <!-- Indicador de Monitoramento Ativo -->
      <div class="monitoring-active">
        <div class="text">${isClean ? 'Monitoramento ativo - Site seguro e funcionando normalmente' : 'Monitoramento ativo - Nossa equipe está trabalhando para manter seu site seguro'}</div>
      </div>
      
      <!-- Métricas Principais -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Disponibilidade (Uptime)</div>
          ${isClean ? `
            <div class="metric-value ${uptimeRatioClass || 'good'}">${uptimeRatio}</div>
            <div style="margin-top: 5px;">
              <span class="status-badge ${uptimeStatusClass}" style="font-size: 11px; padding: 4px 8px;">
                ${uptimeStatusText}
              </span>
            </div>
          ` : `
            <div style="margin-top: 8px;">
              <span class="status-badge status-online" style="font-size: 11px; padding: 4px 8px;">
                MONITORANDO
              </span>
            </div>
          `}
        </div>
        <div class="metric-card">
          <div class="metric-label">Tempo de Resposta</div>
          ${isClean ? `
            <div class="metric-value ${responseTimeClass || 'good'}">${responseTime}</div>
            ${uptimeLastCheck ? `<div style="margin-top: 5px; font-size: 11px; color: #666;">Última verificação: ${uptimeLastCheck}</div>` : ''}
          ` : `
            <div style="margin-top: 8px;">
              <span class="status-badge status-online" style="font-size: 11px; padding: 4px 8px;">
                MONITORANDO
              </span>
            </div>
          `}
        </div>
        <div class="metric-card">
          <div class="metric-label">Segurança</div>
          ${isClean ? `
            <div class="metric-value good">${securityRating}</div>
            ${securityScore ? `<div style="margin-top: 5px; font-size: 11px; color: #666;">${securityScore}</div>` : ''}
          ` : `
            <div style="margin-top: 8px;">
              <span class="status-badge status-online" style="font-size: 11px; padding: 4px 8px;">
                MONITORANDO
              </span>
            </div>
          `}
        </div>
        <div class="metric-card">
          <div class="metric-label">Última Varredura</div>
          <div class="metric-value" style="font-size: 16px;">${scanDate}</div>
          ${monitoringSince ? `<div style="margin-top: 5px; font-size: 11px; color: #666;">Monitorado há ${monitoringSince}</div>` : ''}
        </div>
      </div>
      
      <!-- Status de Segurança -->
      <div class="section-title">Status de Segurança</div>
      
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Malware</div>
          <div class="info-value" style="color: #059669">
            ${isClean ? 'Protegido' : 'Monitorando'}
          </div>
          <div class="info-description">${malwareStatus}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Blacklist</div>
          <div class="info-value" style="color: #059669">
            ${isClean ? 'Verificado' : 'Monitorando'}
          </div>
          <div class="info-description">${blacklistStatus}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Certificado SSL</div>
          <div class="info-value" style="color: ${sslValid ? '#059669' : '#d97706'}">
            ${sslValid ? 'Ativo' : 'Verificando'}
          </div>
          <div class="info-description">
            ${isClean ? sslStatus : 'Monitoramento ativo do certificado SSL'}
            ${isClean && sslIssuer ? `<br><small>Emissor: ${sslIssuer}</small>` : ''}
            ${isClean && sslExpires ? `<br><small>Válido até: ${sslExpires}</small>` : ''}
            ${isClean && sslDaysUntilExpiry ? `<br><small style="color: ${sslDaysUntilExpiry < 30 ? '#d97706' : '#059669'};">${sslDaysUntilExpiry} dias restantes</small>` : ''}
          </div>
        </div>
        <div class="info-item">
          <div class="info-label">Headers de Segurança</div>
          <div class="info-value" style="color: ${securityHeadersCount === securityHeadersTotal ? '#059669' : '#059669'}">
            ${isClean ? `${securityHeadersCount}/${securityHeadersTotal} Configurados` : 'Monitorando'}
          </div>
          <div class="info-description">Proteção de segurança ativa</div>
        </div>
      </div>
      
      <!-- Informações Técnicas - Só mostrar se status for clean -->
      ${isClean && domainInfo && (domainInfo.ip || domainInfo.server || domainInfo.cms) ? `
        <div class="section-title">Informações Técnicas</div>
        <div class="technical-info">
          <div class="technical-grid">
            ${domainInfo.ip ? `
              <div class="technical-item">
                <div class="technical-label">Endereço IP</div>
                <div class="technical-value">${domainInfo.ip}</div>
              </div>
            ` : ''}
            ${domainInfo.server ? `
              <div class="technical-item">
                <div class="technical-label">Servidor Web</div>
                <div class="technical-value">${domainInfo.server}</div>
              </div>
            ` : ''}
            ${domainInfo.cms ? `
              <div class="technical-item">
                <div class="technical-label">CMS</div>
                <div class="technical-value">${domainInfo.cms}</div>
              </div>
            ` : ''}
          </div>
        </div>
      ` : ''}
      
      <!-- Headers de Segurança Detalhados - Só mostrar se status for clean -->
      ${isClean && securityHeadersList.length > 0 ? `
        <div class="section-title">Headers de Segurança Configurados</div>
        <div class="category-section">
          <div style="display: grid; gap: 10px;">
            ${securityHeadersList.map(header => `
              <div style="padding: 10px; background: white; border-radius: 6px; border-left: 3px solid ${header.status === 'clean' ? '#059669' : '#d97706'};">
                <strong>${header.name}:</strong> 
                <span style="color: #666; font-size: 13px;">${header.value || 'Não configurado'}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      <!-- Varredura de Arquivos (Wordfence) -->
      ${site.wordfence_enabled && site.wordfence_scan_status ? `
        <div class="section-title">Varredura de Arquivos</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Varredura Interna</div>
            <div class="info-value" style="color: ${site.wordfence_scan_status === 'clean' ? '#059669' : site.wordfence_scan_status === 'warning' ? '#d97706' : '#ef4444'}">
              ${site.wordfence_scan_status === 'clean' ? 'Limpo' : site.wordfence_scan_status === 'warning' ? 'Verificando' : site.wordfence_scan_status === 'infected' ? 'Atenção' : 'Monitorando'}
            </div>
            <div class="info-description">
              ${site.wordfence_scan_status === 'clean' 
                ? 'Nenhum arquivo infectado detectado na varredura interna' 
                : site.wordfence_scan_status === 'warning'
                ? 'Verificações em andamento - nossa equipe está analisando'
                : site.wordfence_scan_status === 'infected'
                ? 'Análise em andamento - nossa equipe está verificando'
                : 'Monitoramento ativo de arquivos do servidor'}
              ${site.wordfence_last_scan ? `<br><small>Última varredura: ${new Date(site.wordfence_last_scan).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</small>` : ''}
            </div>
          </div>
        </div>
      ` : ''}
      
      <!-- Resumo -->
      <div class="alert-box alert-success">
        <strong>Resumo:</strong><br>
        ${isClean 
          ? 'Site monitorado e seguro. Todas as verificações de segurança estão em dia.' 
          : 'Site sob monitoramento contínuo. Nossa equipe está trabalhando para garantir que todas as verificações de segurança estejam em dia.'}
        ${site.wordfence_enabled ? ' Varredura de arquivos do servidor ativa via Wordfence.' : ''}
      </div>
    </div>
  `;
}

module.exports = {
  getProfessionalReportTemplate,
  formatSiteCardProfessional
};
