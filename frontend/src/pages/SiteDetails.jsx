import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from 'react-query'
import api from '../services/api'
import './SiteDetails.css'

const SiteDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isLoading, error } = useQuery(
    ['siteDetails', id],
    async () => {
      const response = await api.get(`/sites/${id}/details`)
      return response.data.data
    },
    {
      enabled: !!id,
      staleTime: 30000
    }
  )

  const { data: siteData } = useQuery(
    ['site', id],
    async () => {
      const response = await api.get(`/sites/${id}`)
      const data = response.data.data
      console.log('[SiteDetails] Dados do site carregados:', {
        domain: data.domain,
        wordfence_enabled: data.wordfence_enabled,
        wordfence_last_scan: data.wordfence_last_scan,
        wordfence_scan_status: data.wordfence_scan_status,
        wordfence_scan_details: data.wordfence_scan_details ? 'Presente' : 'Ausente'
      })
      return data
    },
    {
      enabled: !!id,
      refetchInterval: 30000, // Atualizar a cada 30 segundos
      staleTime: 10000 // Considerar dados obsoletos após 10 segundos
    }
  )

  const getStatusClass = (status) => {
    const statusMap = {
      'clean': 'status-clean',
      'warning': 'status-warning',
      'infected': 'status-infected',
      'unknown': 'status-unknown'
    }
    return statusMap[status] || 'status-unknown'
  }

  const getStatusIcon = (status) => {
    return <span className={`status-icon-small ${status}`}></span>
  }

  const getStatusLabel = (status) => {
    const labels = {
      'clean': 'OK',
      'warning': 'Atenção',
      'infected': 'Crítico',
      'unknown': 'Desconhecido'
    }
    return labels[status] || 'Desconhecido'
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = String(date.getFullYear()).slice(-2)
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${day}/${month}/${year} às ${hours}:${minutes}`
  }

  const getStatusPriority = (status) => {
    const priorityMap = {
      'clean': 1,      // Verde - primeiro
      'warning': 2,    // Amarelo - segundo
      'infected': 3,   // Vermelho - terceiro
      'unknown': 4     // Cinza - último
    }
    return priorityMap[status] || 4
  }

  const sortCategoriesByStatus = (categories) => {
    return [...categories].sort((a, b) => {
      const priorityA = getStatusPriority(a.status)
      const priorityB = getStatusPriority(b.status)
      return priorityA - priorityB
    })
  }

  return (
    <div className="site-details-page">
      <nav className="details-navbar">
        <div className="navbar-content">
          <button className="back-button" onClick={() => navigate('/')}>
            ← Voltar
          </button>
          <h1>Detalhes da Análise</h1>
        </div>
      </nav>

      <div className="details-container">
        {siteData && (
          <div className="site-info-header">
            <h2>{siteData.domain}</h2>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '10px' }}>
              {siteData.last_scan && (
                <p className="last-scan">
                  Última varredura (Sucuri): {formatDate(siteData.last_scan)}
                </p>
              )}
              {siteData.wordfence_enabled && siteData.wordfence_last_scan && (
                <p className="last-scan" style={{ color: '#10b981' }}>
                  ✓ Wordfence: {formatDate(siteData.wordfence_last_scan)}
                </p>
              )}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="loading-state">
            Carregando detalhes...
          </div>
        )}

        {error && (
          <div className="error-state">
            Erro ao carregar detalhes: {error.message}
          </div>
        )}

        {data && (
          <>
            <div className={`summary-box ${getStatusClass(data.overallStatus)}`}>
              <div className="summary-header">
                {getStatusIcon(data.overallStatus)}
              </div>
              <p className="summary-text">{data.summary}</p>
            </div>

            {(() => {
              // Preparar todas as categorias, incluindo Wordfence
              let allCategories = data.categories.filter(category => category.name !== 'Classificação de Segurança');
              
              // Adicionar categoria Wordfence se estiver habilitado
              if (siteData && siteData.wordfence_enabled) {
                const wordfenceStatus = siteData.wordfence_scan_status || 'unknown';
                const wordfenceItems = [];
                
                if (siteData.wordfence_last_scan) {
                  wordfenceItems.push({
                    label: 'Status da Varredura',
                    description: 'Último resultado do scan do Wordfence',
                    value: wordfenceStatus === 'clean' ? 'Limpo' :
                           wordfenceStatus === 'warning' ? 'Verificando' :
                           wordfenceStatus === 'infected' ? 'Atenção - Arquivos Infectados' :
                           'Aguardando varredura',
                    status: wordfenceStatus
                  });
                  
                  wordfenceItems.push({
                    label: 'Última Varredura',
                    description: 'Data/hora da última varredura do Wordfence',
                    value: formatDate(siteData.wordfence_last_scan),
                    status: null // Sem status para não aplicar background verde
                  });
                  
                  if (siteData.wordfence_scan_details) {
                    try {
                      const details = JSON.parse(siteData.wordfence_scan_details);
                      console.log('[SiteDetails] Dados Wordfence parseados:', details);
                      
                      if (details.total_files_scanned !== undefined) {
                        wordfenceItems.push({
                          label: 'Arquivos Escaneados',
                          description: 'Total de arquivos verificados',
                          value: details.total_files_scanned.toLocaleString('pt-BR'),
                          status: null // Sem status para não aplicar background verde
                        });
                      }
                      
                      if (details.infected_files_count > 0) {
                        wordfenceItems.push({
                          label: 'Arquivos Infectados',
                          description: 'Arquivos com problemas detectados',
                          value: details.infected_files_count.toString(),
                          status: 'infected'
                        });
                      }
                      
                      if (details.critical_count > 0) {
                        wordfenceItems.push({
                          label: 'Avisos Críticos',
                          description: 'Problemas críticos detectados pelo Wordfence',
                          value: details.critical_count.toString(),
                          status: 'infected'
                        });
                      }
                      
                      if (details.medium_count > 0) {
                        wordfenceItems.push({
                          label: 'Avisos Médios',
                          description: 'Problemas médios detectados pelo Wordfence',
                          value: details.medium_count.toString(),
                          status: 'warning'
                        });
                      }
                      
                      if (details.warnings_count > 0 && !details.critical_count && !details.medium_count) {
                        wordfenceItems.push({
                          label: 'Avisos',
                          description: 'Problemas detectados',
                          value: details.warnings_count.toString(),
                          status: 'warning'
                        });
                      }
                    } catch (e) {
                      // Ignorar erro de parsing
                    }
                  }
                } else {
                  wordfenceItems.push({
                    label: 'Status',
                    description: 'Aguardando primeira varredura',
                    value: 'Aguardando varredura',
                    status: 'unknown'
                  });
                }
                
                const wordfenceCategory = {
                  name: 'Varredura de Arquivos (Wordfence)',
                  description: siteData.wordfence_last_scan 
                    ? 'Varredura interna de arquivos do servidor realizada pelo Wordfence instalado no WordPress.'
                    : 'Wordfence está configurado, mas ainda não foi executado um scan que busque os dados do Wordfence. Execute um scan manual no Dashboard para obter os dados do Wordfence.',
                  status: wordfenceStatus,
                  items: wordfenceItems,
                  isWordfence: true,
                  wordfenceData: siteData
                };
                
                allCategories.push(wordfenceCategory);
              }
              
              // Ordenar todas as categorias por status
              const sortedCategories = sortCategoriesByStatus(allCategories);
              
              return (
                <div className="categories-list">
                  {sortedCategories.map((category, index) => (
                    <div key={index} className="category-card">
                      <div className="category-header">
                        <h3>{category.name}</h3>
                        <span className={`category-status ${getStatusClass(category.status)}`}>
                          {getStatusIcon(category.status)}
                        </span>
                      </div>
                      <p className="category-description">{category.description}</p>
                      
                      {category.items && category.items.length > 0 ? (
                        <div className="category-items">
                          {category.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="category-item">
                              <div className="item-label">
                                <div className="item-label-content">
                                  <span>{item.label}</span>
                                  {item.description && (
                                    <span className="item-description">{item.description}</span>
                                  )}
                                </div>
                              </div>
                              <div className={`item-value ${item.status ? getStatusClass(item.status) : ''}`}>
                                <span>{item.value}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : category.isWordfence && !category.wordfenceData.wordfence_last_scan ? (
                        <div style={{ padding: '15px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', marginTop: '15px' }}>
                          <p style={{ margin: 0, color: '#999' }}>
                            ⚠️ Execute um scan manual no Dashboard para buscar os dados do Wordfence.
                          </p>
                        </div>
                      ) : null}
                      
                      {category.isWordfence && category.wordfenceData && category.wordfenceData.wordfence_scan_status === 'infected' && (
                        <div style={{ marginTop: '15px', padding: '15px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                          <strong style={{ color: '#ef4444' }}>⚠️ Atenção:</strong>
                          <p style={{ margin: '8px 0 0 0', color: '#e0e0e0' }}>
                            O Wordfence detectou arquivos infectados ou problemas de segurança. 
                            Acesse o painel do Wordfence no WordPress para mais detalhes e ações corretivas.
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </>
        )}

        {data && data.categories.length === 0 && (
          <div className="empty-state">
            <p>Nenhum scan foi realizado ainda para este site.</p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              Voltar ao Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default SiteDetails

