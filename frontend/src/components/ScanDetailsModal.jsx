import React from 'react'
import { useQuery } from 'react-query'
import api from '../services/api'
import './ScanDetailsModal.css'

const ScanDetailsModal = ({ siteId, siteDomain, onClose }) => {
  const { data, isLoading, error } = useQuery(
    ['siteDetails', siteId],
    async () => {
      const response = await api.get(`/sites/${siteId}/details`)
      return response.data.data
    },
    {
      enabled: !!siteId,
      staleTime: 30000
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

  if (!siteId) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Detalhes da Análise</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="site-info">
            <strong>{siteDomain}</strong>
          </div>

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

              <div className="categories-list">
                {sortCategoriesByStatus(
                  data.categories.filter(category => category.name !== 'Classificação de Segurança')
                ).map((category, index) => (
                  <div key={index} className="category-card">
                    <div className="category-header">
                      <h3>{category.name}</h3>
                      <span className={`category-status ${getStatusClass(category.status)}`}>
                        {getStatusIcon(category.status)}
                      </span>
                    </div>
                    <p className="category-description">{category.description}</p>
                    <div className="category-items">
                      {category.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="category-item">
                          <div className="item-label">
                            {getStatusIcon(item.status)}
                            <span>{item.label}</span>
                          </div>
                          <div className={`item-value ${getStatusClass(item.status)}`}>
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

export default ScanDetailsModal


