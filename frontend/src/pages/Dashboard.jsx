import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEnvelope, faTrash, faSpinner, faEdit, faShieldAlt, faPaperPlane, faRedo, faSort, faSortUp, faSortDown, faCheckCircle } from '@fortawesome/free-solid-svg-icons'
import ReportModal from '../components/ReportModal'
import ConfirmModal from '../components/ConfirmModal'
import AlertModal from '../components/AlertModal'
import './Dashboard.css'
import '../components/ScanDetailsModal.css'

const Dashboard = () => {
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [showAddSite, setShowAddSite] = useState(false)
  const [newSite, setNewSite] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [scanningSiteId, setScanningSiteId] = useState(null)
  const [sendingReportId, setSendingReportId] = useState(null)
  const [creatingMonitorId, setCreatingMonitorId] = useState(null)
  const [reportModalSiteId, setReportModalSiteId] = useState(null)
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    phone: ''
  })
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: 'warning',
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Confirmar',
    cancelText: 'Cancelar'
  })
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    buttonText: 'OK'
  })
  const [activeFilter, setActiveFilter] = useState(null) // null, 'total', 'clean', 'warning', 'infected'
  const [sortColumn, setSortColumn] = useState(null) // null, 'client', 'site', 'status', 'uptime', 'last_scan', 'last_report_date'
  const [sortDirection, setSortDirection] = useState('asc') // 'asc' ou 'desc'

  // Buscar sites - atualizar automaticamente a cada 30 segundos para refletir mudanças de uptime
  const { data: sitesData, isLoading } = useQuery('sites', async () => {
    const response = await api.get('/sites')
    return response.data.data
  }, {
    refetchInterval: 30000, // Atualizar a cada 30 segundos
    staleTime: 10000 // Considerar dados "frescos" por 10 segundos
  })

  // Buscar clientes
  const { data: clientsData } = useQuery('clients', async () => {
    const response = await api.get('/clients')
    return response.data.data
  }, {
    staleTime: 60000 // Cache por 1 minuto
  })

  // Mutação para adicionar site
  const addSiteMutation = useMutation(
    async (data) => {
      const response = await api.post('/sites', data)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('sites')
        setShowAddSite(false)
        setNewSite('')
        setSelectedClientId('')
      }
    }
  )

  // Mutação para criar cliente
  const createClientMutation = useMutation(
    async (data) => {
      const response = await api.post('/clients', data)
      return response.data
    },
    {
      onSuccess: (data) => {
        // Invalidar e atualizar a lista de clientes
        queryClient.invalidateQueries('clients')
        // Selecionar o novo cliente no select
        setSelectedClientId(data.data.id.toString())
        // Fechar o modal e limpar o formulário
        setShowNewClientModal(false)
        setNewClient({ name: '', email: '', phone: '' })
        // Mostrar mensagem de sucesso
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Sucesso',
          message: 'Cliente criado com sucesso!',
          buttonText: 'OK'
        })
      },
      onError: (error) => {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Erro',
          message: error.response?.data?.message || 'Erro ao criar cliente',
          buttonText: 'OK'
        })
      }
    }
  )

  // Mutação para escanear site
  const scanMutation = useMutation(
    async (id) => {
      const response = await api.post(`/scan/${id}`)
      return response.data
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('sites')
        // Atualização silenciosa - o resultado aparece automaticamente na tabela
      },
      onError: (error) => {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Erro',
          message: `Erro ao escanear site:\n\n${error.response?.data?.message || error.message}\n\nVerifique se o backend está rodando e tente novamente.`,
          buttonText: 'OK'
        })
      },
      onSettled: () => {
        setScanningSiteId(null)
      }
    }
  )


  // Mutação para remover site (o backend remove automaticamente o monitor do UptimeRobot se existir)
  const deleteMutation = useMutation(
    async (id) => {
      const response = await api.delete(`/sites/${id}`)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('sites')
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Sucesso',
          message: 'Site e monitor removidos com sucesso!',
          buttonText: 'OK'
        })
      },
      onError: (error) => {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Erro',
          message: `Erro ao remover site: ${error.response?.data?.message || error.message}`,
          buttonText: 'OK'
        })
      }
    }
  )

  // Mutação para enviar relatório
  const sendReportMutation = useMutation(
    async ({ siteId, email, subject, body }) => {
      const response = await api.post(`/reports/site/${siteId}`, {
        email,
        subject,
        body
      })
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('sites')
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Sucesso',
          message: 'Relatório enviado com sucesso!',
          buttonText: 'OK'
        })
      },
      onError: (error) => {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Erro',
          message: `Erro ao enviar relatório: ${error.response?.data?.message || error.message}`,
          buttonText: 'OK'
        })
      },
      onSettled: () => {
        setSendingReportId(null)
      }
    }
  )


  // Mutação para criar monitor no UptimeRobot
  const createMonitorMutation = useMutation(
    async (siteId) => {
      const response = await api.post(`/uptimerobot/monitor/${siteId}`)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('sites')
        // Atualização silenciosa - o status é atualizado automaticamente na tabela
      },
      onError: (error) => {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Erro',
          message: `Erro ao criar monitor: ${error.response?.data?.message || error.message}`,
          buttonText: 'OK'
        })
      },
      onSettled: () => {
        setCreatingMonitorId(null)
      }
    }
  )

  const handleAddSite = (e) => {
    e.preventDefault()
    if (newSite.trim()) {
      addSiteMutation.mutate({
        domain: newSite.trim(),
        client_id: selectedClientId || null
      })
    }
  }

  const handleSendReport = (id) => {
    setReportModalSiteId(id)
  }

  const handleReportSend = async (siteId, reportData) => {
    setSendingReportId(siteId)
    await sendReportMutation.mutateAsync({
      siteId,
      ...reportData
    })
  }

  const handleScan = (id) => {
    setScanningSiteId(id)
    scanMutation.mutate(id)
  }


  const handleDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      type: 'danger',
      title: 'Remover Site',
      message: 'Deseja remover este site? Isso também removerá o monitor do UptimeRobot se existir.',
      confirmText: 'Remover',
      cancelText: 'Cancelar',
      onConfirm: () => {
        setConfirmModal({ ...confirmModal, isOpen: false })
        deleteMutation.mutate(id)
      }
    })
  }


    const handleCreateMonitor = (siteId) => {
      setCreatingMonitorId(siteId)
      createMonitorMutation.mutate(siteId)
    }


    const getUptimeStatusText = (status) => {
      const statusMap = {
        'up': 'Online',
        'down': 'Offline',
        'seems_down': 'Parece Offline',
        'paused': 'Pausado',
        'unknown': 'Desconhecido'
      }
      return statusMap[status] || 'Desconhecido'
    }

    const getUptimeStatusClass = (status) => {
      const classMap = {
        'up': 'uptime-up',
        'down': 'uptime-down',
        'seems_down': 'uptime-warning',
        'paused': 'uptime-paused',
        'unknown': 'uptime-unknown'
      }
      return classMap[status] || 'uptime-unknown'
    }

  const getStatusClass = (status) => {
    const statusMap = {
      'clean': 'status-clean',
      'warning': 'status-warning',
      'infected': 'status-infected',
      'unknown': 'status-unknown'
    }
    return statusMap[status] || 'status-unknown'
  }

  const getStatusText = (status) => {
    const statusMap = {
      'clean': 'Verificado',
      'warning': 'Verificar',
      'infected': 'Infectado',
      'unknown': 'Desconhecido'
    }
    return statusMap[status] || 'Desconhecido'
  }
  
  const getStatusIcon = (status) => {
    return <span className={`status-icon ${status}`}></span>
  }
  
  // Formatar data com mês abreviado e hora: "11/nov - 23h02"
  const formatDateWithTime = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
    const day = date.getDate().toString().padStart(2, '0')
    const month = months[date.getMonth()]
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${day}/${month} - ${hours}h${minutes}`
  }

  // Formatar data apenas com mês abreviado: "11/nov"
  const formatDateShort = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
    const day = date.getDate().toString().padStart(2, '0')
    const month = months[date.getMonth()]
    return `${day}/${month}`
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

  // Calcular estatísticas
  const stats = sitesData ? {
    total: sitesData.length,
    clean: sitesData.filter(s => s.last_status === 'clean').length,
    warning: sitesData.filter(s => s.last_status === 'warning').length,
    infected: sitesData.filter(s => s.last_status === 'infected').length
  } : { total: 0, clean: 0, warning: 0, infected: 0 }

  // Filtrar sites baseado no filtro ativo
  const filteredSites = sitesData ? (() => {
    if (!activeFilter || activeFilter === 'total') {
      return sitesData
    }
    return sitesData.filter(site => {
      switch (activeFilter) {
        case 'clean':
          return site.last_status === 'clean'
        case 'warning':
          return site.last_status === 'warning'
        case 'infected':
          return site.last_status === 'infected'
        default:
          return true
      }
    })
  })() : []

  // Handler para clicar nas cards de estatísticas
  const handleFilterClick = (filterType) => {
    if (activeFilter === filterType) {
      // Se clicar no mesmo filtro, remove o filtro
      setActiveFilter(null)
    } else {
      // Aplica o novo filtro
      setActiveFilter(filterType)
    }
  }

  // Handler para ordenar colunas
  const handleSort = (column) => {
    if (sortColumn === column) {
      // Se clicar na mesma coluna, inverte a direção
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Nova coluna, começa com ascendente
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Função para obter o ícone de ordenação
  const getSortIcon = (column) => {
    if (sortColumn !== column) {
      return <FontAwesomeIcon icon={faSort} style={{ opacity: 0.4, marginLeft: '8px', fontSize: '12px' }} />
    }
    return sortDirection === 'asc' 
      ? <FontAwesomeIcon icon={faSortUp} style={{ marginLeft: '8px', fontSize: '12px', color: '#667eea' }} />
      : <FontAwesomeIcon icon={faSortDown} style={{ marginLeft: '8px', fontSize: '12px', color: '#667eea' }} />
  }

  // Função para ordenar os dados
  const sortSites = (sites) => {
    if (!sortColumn || !sites) return sites

    const sorted = [...sites].sort((a, b) => {
      let aValue, bValue

      switch (sortColumn) {
        case 'client':
          aValue = a.client?.name?.split(' ')[0] || ''
          bValue = b.client?.name?.split(' ')[0] || ''
          break
        case 'site':
          aValue = a.domain || ''
          bValue = b.domain || ''
          break
        case 'status':
          // Ordenar por prioridade: clean (1), warning (2), infected (3), unknown (4)
          const statusPriority = { 'clean': 1, 'warning': 2, 'infected': 3, 'unknown': 4 }
          aValue = statusPriority[a.last_status] || 5
          bValue = statusPriority[b.last_status] || 5
          break
        case 'uptime':
          aValue = a.uptime_uptime_ratio !== null ? parseFloat(a.uptime_uptime_ratio) : -1
          bValue = b.uptime_uptime_ratio !== null ? parseFloat(b.uptime_uptime_ratio) : -1
          break
        case 'last_scan':
          aValue = a.last_scan ? new Date(a.last_scan).getTime() : -1
          bValue = b.last_scan ? new Date(b.last_scan).getTime() : -1
          break
        case 'last_report_date':
          aValue = a.last_report_date ? new Date(a.last_report_date).getTime() : -1
          bValue = b.last_report_date ? new Date(b.last_report_date).getTime() : -1
          break
        default:
          return 0
      }

      // Comparação
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        // Comparação de strings (case-insensitive)
        const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase(), 'pt-BR')
        return sortDirection === 'asc' ? comparison : -comparison
      } else {
        // Comparação numérica
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      }
    })

    return sorted
  }

  return (
    <div className="dashboard">
      <nav className="navbar">
        <div className="navbar-content">
          <h1>ArtnaWEB Monitor</h1>
          <div className="navbar-actions">
            <button 
              onClick={() => navigate('/settings')} 
              className="btn btn-secondary"
              title="Configurações"
            >
              Configurações
            </button>
            <span>{user?.username}</span>
            <button onClick={logout} className="btn btn-outline">Sair</button>
          </div>
        </div>
      </nav>

      <div className="container">
        {/* Estatísticas */}
        <div className="stats-grid">
          <div 
            className={`stat-card stat-total ${activeFilter === 'total' ? 'active' : ''}`}
            onClick={() => handleFilterClick('total')}
            style={{ cursor: 'pointer' }}
            title="Clique para filtrar todos os sites"
          >
            <h3>Total de Sites</h3>
            <h2>{stats.total}</h2>
          </div>
          <div 
            className={`stat-card stat-clean ${activeFilter === 'clean' ? 'active' : ''}`}
            onClick={() => handleFilterClick('clean')}
            style={{ cursor: 'pointer' }}
            title="Clique para filtrar apenas sites verificados"
          >
            <h3>Verificados</h3>
            <h2>{stats.clean}</h2>
          </div>
          <div 
            className={`stat-card stat-warning ${activeFilter === 'warning' ? 'active' : ''}`}
            onClick={() => handleFilterClick('warning')}
            style={{ cursor: 'pointer' }}
            title="Clique para filtrar apenas sites com avisos (não críticos - SEM malware)"
          >
            <h3>Verificar</h3>
            <h2>{stats.warning}</h2>
            <small style={{ opacity: 0.7 }}>Avisos não críticos</small>
          </div>
          <div 
            className={`stat-card stat-infected ${activeFilter === 'infected' ? 'active' : ''}`}
            onClick={() => handleFilterClick('infected')}
            style={{ cursor: 'pointer' }}
            title="Clique para filtrar apenas sites infectados"
          >
            <h3>Infectados</h3>
            <h2>{stats.infected}</h2>
            <small style={{ opacity: 0.7, fontWeight: 'bold' }}>Ação urgente</small>
          </div>
        </div>

        {/* Ações */}
        <div className="actions-bar">
          <h2>Sites Monitorados</h2>
          <div className="actions">
            <button 
              onClick={() => setShowAddSite(!showAddSite)}
              className="btn btn-success"
            >
              Adicionar Site
            </button>
          </div>
        </div>

        {/* Formulário Adicionar Site */}
        {showAddSite && (
          <div className="add-site-form">
            <form onSubmit={handleAddSite}>
              <div className="form-row">
                <div className="form-group">
                  <label>Domínio do Site</label>
                  <input
                    type="text"
                    placeholder="https://meusite.com.br"
                    value={newSite}
                    onChange={(e) => setNewSite(e.target.value)}
                    disabled={addSiteMutation.isLoading}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Cliente (Opcional)</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === 'new') {
                        // Abrir modal para criar novo cliente
                        setShowNewClientModal(true)
                        setSelectedClientId('') // Resetar seleção
                      } else {
                        setSelectedClientId(value)
                      }
                    }}
                    disabled={addSiteMutation.isLoading}
                  >
                    <option value="">Nenhum cliente</option>
                    {clientsData && clientsData.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name} ({client.email})
                      </option>
                    ))}
                    <option value="new" style={{ fontWeight: 'bold', color: '#667eea' }}>
                      + Novo Cliente
                    </option>
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={addSiteMutation.isLoading}
                >
                  {addSiteMutation.isLoading ? 'Salvando...' : 'Salvar'}
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setShowAddSite(false)
                    setNewSite('')
                    setSelectedClientId('')
                  }}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tabela de Sites */}
        <div className="sites-table-container">
          {isLoading ? (
            <div className="loading">Carregando...</div>
          ) : filteredSites && filteredSites.length > 0 ? (
            <table className="sites-table">
              <thead>
                <tr>
                  <th 
                    onClick={() => handleSort('client')}
                    className="sortable-header"
                    title="Clique para ordenar"
                  >
                    Cliente {getSortIcon('client')}
                  </th>
                  <th 
                    onClick={() => handleSort('site')}
                    className="sortable-header"
                    title="Clique para ordenar"
                  >
                    Site {getSortIcon('site')}
                  </th>
                  <th 
                    onClick={() => handleSort('status')}
                    className="sortable-header"
                    title="Clique para ordenar"
                  >
                    Status {getSortIcon('status')}
                  </th>
                  <th 
                    onClick={() => handleSort('uptime')}
                    className="sortable-header"
                    title="Clique para ordenar"
                  >
                    Uptime {getSortIcon('uptime')}
                  </th>
                  <th 
                    onClick={() => handleSort('last_scan')}
                    className="sortable-header"
                    title="Clique para ordenar"
                  >
                    Última Varredura {getSortIcon('last_scan')}
                  </th>
                  <th 
                    onClick={() => handleSort('last_report_date')}
                    className="sortable-header"
                    title="Clique para ordenar"
                  >
                    Relatório Enviado {getSortIcon('last_report_date')}
                  </th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {sortSites(filteredSites).map((site) => (
                  <tr key={site.id}>
                    <td>
                      {site.client ? (
                        <span className="client-name">{site.client.name.split(' ')[0]}</span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <a 
                          href={site.domain.startsWith('http://') || site.domain.startsWith('https://') 
                            ? site.domain 
                            : `https://${site.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="site-domain-link"
                          title={`Abrir ${site.domain} em nova aba`}
                        >
                          <strong>{site.domain}</strong>
                        </a>
                        {site.wordfence_enabled && (
                          <span style={{ 
                            fontSize: '10px', 
                            color: '#10b981', 
                            opacity: 0.65,
                            fontWeight: '400',
                            fontStyle: 'italic',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: '10px' }} />
                            WF Ativo
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span 
                        className={`status-badge ${getStatusClass(site.last_status)}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/site/${site.id}`)}
                      >
                        {getStatusIcon(site.last_status)}
                        {getStatusText(site.last_status)}
                      </span>
                    </td>
                    <td>
                      {site.uptime_status ? (
                        <div className="uptime-info">
                          <span className={`uptime-badge ${getUptimeStatusClass(site.uptime_status)}`}>
                            {getUptimeStatusText(site.uptime_status)}
                          </span>
                          {site.uptime_uptime_ratio !== null && (
                            <small className="uptime-ratio">
                              {parseFloat(site.uptime_uptime_ratio).toFixed(2)}%
                            </small>
                          )}
                          {/* Tempo de resposta oculto temporariamente */}
                          {/* {site.uptime_response_time !== null && site.uptime_response_time > 0 && (
                            <small className="uptime-response">
                              {site.uptime_response_time}ms
                            </small>
                          )} */}
                        </div>
                      ) : site.uptimerobot_monitor_id ? (
                        <span className="text-muted">Sincronizando...</span>
                      ) : (
                        <button
                          onClick={() => handleCreateMonitor(site.id)}
                          className="btn btn-sm btn-secondary"
                          disabled={creatingMonitorId === site.id}
                          title="Criar monitor no UptimeRobot"
                        >
                          {creatingMonitorId === site.id ? 'Criando...' : 'Criar Monitor'}
                        </button>
                      )}
                    </td>
                    <td>
                      {site.last_scan ? (
                        formatDateWithTime(site.last_scan)
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      {site.last_report_date ? (
                        <span style={{ color: '#e0e0e0' }}>
                          {formatDateShort(site.last_report_date)}
                        </span>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '12px' }}>-</span>
                      )}
                    </td>
                    <td>
                      <div className="actions-cell">
                          <button
                            onClick={() => handleScan(site.id)}
                            className="btn btn-icon btn-primary"
                            disabled={scanMutation.isLoading || scanningSiteId === site.id}
                            title="Escanear site"
                          >
                            <FontAwesomeIcon 
                              icon={scanningSiteId === site.id ? faSpinner : faRedo} 
                              spin={scanningSiteId === site.id}
                            />
                          </button>
                        {site.client && (
                          <button
                            onClick={() => handleSendReport(site.id)}
                            disabled={sendingReportId === site.id}
                            className="btn btn-icon btn-report"
                            title="Enviar relatório por email"
                          >
                            <FontAwesomeIcon 
                              icon={sendingReportId === site.id ? faSpinner : faPaperPlane} 
                              spin={sendingReportId === site.id}
                            />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(site.id)}
                          className="btn btn-icon btn-danger"
                          disabled={deleteMutation.isLoading || scanningSiteId === site.id}
                          title="Remover site e monitor do UptimeRobot"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeFilter && sitesData && sitesData.length > 0 ? (
            <div className="empty-state">
              <p>Nenhum site encontrado com o filtro selecionado.</p>
              <button
                onClick={() => setActiveFilter(null)}
                className="btn btn-secondary"
                style={{ marginTop: '12px' }}
              >
                Limpar Filtro
              </button>
            </div>
          ) : (
            <div className="empty-state">
              <p>Nenhum site cadastrado. Adicione um site para começar.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Relatório */}
      {reportModalSiteId && (
        <ReportModal
          siteId={reportModalSiteId}
          onClose={() => setReportModalSiteId(null)}
          onSend={handleReportSend}
        />
      )}

      {/* Modal de Confirmação */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm || (() => {})}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        isLoading={scanMutation.isLoading || deleteMutation.isLoading || creatingMonitorId !== null}
      />

      {/* Modal de Alerta/Notificação */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        buttonText={alertModal.buttonText}
      />

      {/* Modal de Novo Cliente */}
      {showNewClientModal && (
        <div className="modal-overlay" onClick={() => setShowNewClientModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Novo Cliente</h2>
              <button className="modal-close" onClick={() => setShowNewClientModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '30px' }}>
              <form onSubmit={(e) => {
                e.preventDefault()
                if (newClient.name && newClient.email) {
                  createClientMutation.mutate(newClient)
                }
              }}>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#b0b0b0', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nome *</label>
                  <input
                    type="text"
                    placeholder="Nome do cliente"
                    value={newClient.name}
                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                    disabled={createClientMutation.isLoading}
                    required
                    style={{
                      width: '100%',
                      padding: '14px 18px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#e0e0e0',
                      transition: 'all 0.3s ease',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                    }}
                    onFocus={(e) => {
                      e.target.style.outline = 'none'
                      e.target.style.borderColor = '#667eea'
                      e.target.style.background = 'rgba(255, 255, 255, 0.08)'
                      e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                      e.target.style.background = 'rgba(255, 255, 255, 0.05)'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#b0b0b0', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email *</label>
                  <input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    disabled={createClientMutation.isLoading}
                    required
                    style={{
                      width: '100%',
                      padding: '14px 18px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#e0e0e0',
                      transition: 'all 0.3s ease',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                    }}
                    onFocus={(e) => {
                      e.target.style.outline = 'none'
                      e.target.style.borderColor = '#667eea'
                      e.target.style.background = 'rgba(255, 255, 255, 0.08)'
                      e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                      e.target.style.background = 'rgba(255, 255, 255, 0.05)'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#b0b0b0', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Telefone (Opcional)</label>
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    disabled={createClientMutation.isLoading}
                    style={{
                      width: '100%',
                      padding: '14px 18px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#e0e0e0',
                      transition: 'all 0.3s ease',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                    }}
                    onFocus={(e) => {
                      e.target.style.outline = 'none'
                      e.target.style.borderColor = '#667eea'
                      e.target.style.background = 'rgba(255, 255, 255, 0.08)'
                      e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                      e.target.style.background = 'rgba(255, 255, 255, 0.05)'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                </div>
                <div className="form-actions" style={{ marginTop: '30px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewClientModal(false)
                      setNewClient({ name: '', email: '', phone: '' })
                    }}
                    className="btn btn-secondary"
                    disabled={createClientMutation.isLoading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={createClientMutation.isLoading || !newClient.name || !newClient.email}
                  >
                    {createClientMutation.isLoading ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard

