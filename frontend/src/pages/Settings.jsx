import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEdit, faTrash } from '@fortawesome/free-solid-svg-icons'
import api from '../services/api'
import EmailTemplateEditor from '../components/EmailTemplateEditor'
import AlertModal from '../components/AlertModal'
import './Settings.css'

// Componente de Preview do Email de Alertas
const EmailPreview = ({ template }) => {
  // Dados de exemplo para o preview
  const previewData = {
    domain: 'exemplo.com.br',
    status: 'warning',
    statusText: 'Verificar',
    scanDate: new Date().toLocaleString('pt-BR'),
    warnings: '<div class="alert"><h3>Avisos:</h3><ul><li>SSL expirando em 30 dias</li><li>Versão PHP desatualizada</li><li>Algumas vulnerabilidades menores detectadas</li></ul></div>',
    malware: '',
    details: JSON.stringify({
      domain: 'exemplo.com.br',
      status: 'warning',
      warnings: {
        site_issue: [
          { msg: 'SSL expirando em 30 dias' },
          { msg: 'Versão PHP desatualizada' },
          { msg: 'Algumas vulnerabilidades menores detectadas' }
        ]
      },
      ratings: {
        security: { rating: 'B' },
        total: { rating: 'B' }
      }
    }, null, 2)
  }

  // Substituir variáveis no template
  const renderPreview = () => {
    if (!template || template.trim() === '') {
      return (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center', 
          color: '#999',
          background: '#f9f9f9',
          borderRadius: '8px',
          margin: '20px'
        }}>
          <p style={{ fontSize: '16px', marginBottom: '10px' }}>Nenhum template definido</p>
          <p style={{ fontSize: '14px' }}>O template padrão será usado quando o email for enviado.</p>
        </div>
      )
    }

    let rendered = template
    Object.keys(previewData).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      rendered = rendered.replace(regex, previewData[key] || '')
    })

    return rendered
  }

  const renderedHTML = renderPreview()

  // Se não há template, mostrar mensagem simples
  if (!template || template.trim() === '') {
    return (
      <div className="email-preview-wrapper">
        <div className="email-preview-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {renderedHTML}
        </div>
        <div className="email-preview-info">
          <p className="preview-note">
            <strong>Nota:</strong> Esta é uma pré-visualização com dados de exemplo. 
            Os valores reais serão substituídos quando o email for enviado.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="email-preview-wrapper">
      <div className="email-preview-content">
        <iframe
          srcDoc={renderedHTML}
          className="email-preview-iframe"
          title="Email Preview"
          sandbox="allow-same-origin"
        />
      </div>
      <div className="email-preview-info">
        <p className="preview-note">
          <strong>📝 Nota:</strong> Esta é uma pré-visualização com dados de exemplo. 
          Os valores reais serão substituídos quando o email for enviado.
        </p>
      </div>
    </div>
  )
}

// Componente de Configuração Wordfence para Sites
const SitesWordfenceConfig = () => {
  const queryClient = useQueryClient()
  const [expandedSiteId, setExpandedSiteId] = useState(null)
  const [wordfenceConfigs, setWordfenceConfigs] = useState({})
  const [savingSiteId, setSavingSiteId] = useState(null)
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    buttonText: 'OK'
  })

  // Buscar sites
  const { data: sitesData, isLoading } = useQuery('sites', async () => {
    const response = await api.get('/sites')
    return response.data.data
  }, {
    staleTime: 30000
  })

  // Inicializar configurações quando sites carregarem
  useEffect(() => {
    if (sitesData) {
      const configs = {}
      sitesData.forEach(site => {
        configs[site.id] = {
          wordfence_enabled: site.wordfence_enabled || false,
          wordfence_api_key: site.wordfence_api_key || ''
        }
      })
      setWordfenceConfigs(configs)
    }
  }, [sitesData])

  // Mutação para atualizar configuração Wordfence
  const updateWordfenceMutation = useMutation(
    async ({ siteId, config }) => {
      const response = await api.put(`/sites/${siteId}/wordfence`, config)
      return response.data
    },
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries('sites')
        setExpandedSiteId(null)
        setSavingSiteId(null)
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Sucesso',
          message: 'Configuração Wordfence atualizada com sucesso!',
          buttonText: 'OK'
        })
      },
      onError: (error) => {
        setSavingSiteId(null)
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Erro',
          message: error.response?.data?.message || 'Erro ao atualizar configuração Wordfence',
          buttonText: 'OK'
        })
      }
    }
  )

  const handleSaveWordfence = (siteId) => {
    const config = wordfenceConfigs[siteId]
    if (!config) return

    setSavingSiteId(siteId)
    updateWordfenceMutation.mutate({
      siteId,
      config: {
        wordfence_enabled: config.wordfence_enabled,
        wordfence_api_key: config.wordfence_api_key
      }
    })
  }

  const toggleExpand = (siteId) => {
    setExpandedSiteId(expandedSiteId === siteId ? null : siteId)
  }

  const updateConfig = (siteId, field, value) => {
    setWordfenceConfigs(prev => ({
      ...prev,
      [siteId]: {
        ...prev[siteId],
        [field]: value
      }
    }))
  }

  if (isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>Carregando sites...</div>
  }

  if (!sitesData || sitesData.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#999', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <p>Nenhum site cadastrado. Adicione sites no Dashboard para configurar o Wordfence.</p>
      </div>
    )
  }

  return (
    <>
      <div style={{ marginTop: '20px' }}>
        {sitesData.map(site => {
          const isExpanded = expandedSiteId === site.id
          const config = wordfenceConfigs[site.id] || { wordfence_enabled: false, wordfence_api_key: '' }
          const isSaving = savingSiteId === site.id

          return (
            <div 
              key={site.id} 
              style={{ 
                marginBottom: '15px', 
                padding: '20px', 
                background: 'rgba(255, 255, 255, 0.05)', 
                borderRadius: '8px', 
                border: '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.3s ease'
              }}
            >
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => toggleExpand(site.id)}
              >
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: '600' }}>
                    {site.domain}
                  </h3>
                  <div style={{ fontSize: '13px', color: '#999', display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <span>Status: <strong style={{ color: site.last_status === 'clean' ? '#10b981' : site.last_status === 'warning' ? '#f59e0b' : '#ef4444' }}>
                      {site.last_status === 'clean' ? 'Verificado' : site.last_status === 'warning' ? 'Verificar' : site.last_status === 'infected' ? 'Infectado' : 'Desconhecido'}
                    </strong></span>
                    {site.wordfence_enabled && (
                      <span style={{ color: '#10b981' }}>✓ Wordfence Ativo</span>
                    )}
                    {site.wordfence_last_scan && (
                      <span>Último scan: {new Date(site.wordfence_last_scan).toLocaleString('pt-BR')}</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {site.wordfence_enabled && (
                    <span style={{ 
                      padding: '4px 12px', 
                      background: 'rgba(16, 185, 129, 0.2)', 
                      color: '#10b981', 
                      borderRadius: '12px', 
                      fontSize: '12px', 
                      fontWeight: '600' 
                    }}>
                      Ativo
                    </span>
                  )}
                  <span style={{ fontSize: '20px', color: '#999', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>
                    ▼
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={config.wordfence_enabled || false}
                        onChange={(e) => updateConfig(site.id, 'wordfence_enabled', e.target.checked)}
                        disabled={isSaving}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: '500' }}>Habilitar Monitoramento Wordfence</span>
                    </label>
                    <p style={{ marginLeft: '28px', fontSize: '13px', color: '#999', marginTop: '5px' }}>
                      Ative o monitoramento Wordfence para este site WordPress. Requer API key do Wordfence.
                    </p>
                  </div>

                  {config.wordfence_enabled && (
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        API Key do Wordfence
                      </label>
                      <input
                        type="password"
                        placeholder="Cole aqui a API key do Wordfence deste site"
                        value={config.wordfence_api_key || ''}
                        onChange={(e) => updateConfig(site.id, 'wordfence_api_key', e.target.value)}
                        disabled={isSaving}
                        style={{ 
                          width: '100%', 
                          padding: '10px', 
                          background: 'rgba(255, 255, 255, 0.1)', 
                          border: '1px solid rgba(255, 255, 255, 0.2)', 
                          borderRadius: '6px', 
                          color: '#e0e0e0', 
                          fontSize: '14px' 
                        }}
                      />
                      <p style={{ marginTop: '8px', fontSize: '12px', color: '#999' }}>
                        Obtenha a API key no painel do Wordfence do site: Wordfence → Tools → Import/Export
                      </p>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <button
                      onClick={() => setExpandedSiteId(null)}
                      disabled={isSaving}
                      style={{ 
                        padding: '10px 20px', 
                        background: 'rgba(255, 255, 255, 0.1)', 
                        border: '1px solid rgba(255, 255, 255, 0.2)', 
                        borderRadius: '6px', 
                        color: '#e0e0e0', 
                        fontWeight: '600', 
                        cursor: 'pointer', 
                        fontSize: '14px' 
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleSaveWordfence(site.id)}
                      disabled={isSaving || !config.wordfence_enabled || !config.wordfence_api_key?.trim()}
                      style={{ 
                        padding: '10px 20px', 
                        background: isSaving || !config.wordfence_enabled || !config.wordfence_api_key?.trim() 
                          ? 'rgba(102, 126, 234, 0.5)' 
                          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                        border: 'none', 
                        borderRadius: '6px', 
                        color: 'white', 
                        fontWeight: '600', 
                        cursor: isSaving || !config.wordfence_enabled || !config.wordfence_api_key?.trim() ? 'not-allowed' : 'pointer', 
                        fontSize: '14px' 
                      }}
                    >
                      {isSaving ? 'Salvando...' : 'Salvar Configuração'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        buttonText={alertModal.buttonText}
      />
    </>
  )
}

// Componente de Preview do Email de Relatórios
const ReportEmailPreview = ({ template, defaultTemplate }) => {
  // Dados de exemplo para o preview - usando dados mais realistas do novo template
  const previewData = {
    clientName: 'João Silva',
    clientEmail: 'joao@exemplo.com.br',
    clientPhone: '(11) 99999-9999',
    reportDate: new Date().toLocaleString('pt-BR'),
    totalSites: '2',
    sitesList: `
      <div class="site-section">
        <div class="site-header">
          <h2>🌐 exemplo1.com.br</h2>
          <span class="status-badge status-clean">Monitorado e Seguro</span>
        </div>
        <div class="monitoring-active">
          <div class="icon">🟢</div>
          <div class="text">Monitoramento ativo 24/7 - Seu site está sendo protegido continuamente</div>
        </div>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">Disponibilidade (Uptime)</div>
            <div class="metric-value good">99.95%</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Tempo de Resposta</div>
            <div class="metric-value good">245ms</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Classificação de Segurança</div>
            <div class="metric-value good">A</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Última Varredura</div>
            <div class="metric-value" style="font-size: 16px;">${new Date().toLocaleDateString('pt-BR')}</div>
          </div>
        </div>
        <div class="section-title">🔒 Status de Segurança</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Malware</div>
            <div class="info-value" style="color: #059669;">✅ Protegido</div>
            <div class="info-description">Nenhum malware detectado - site seguro</div>
          </div>
          <div class="info-item">
            <div class="info-label">Blacklist</div>
            <div class="info-value" style="color: #059669;">✅ Limpo</div>
            <div class="info-description">Não listado em blacklists - status limpo</div>
          </div>
          <div class="info-item">
            <div class="info-label">Certificado SSL</div>
            <div class="info-value" style="color: #059669;">✅ Ativo</div>
            <div class="info-description">Certificado SSL válido</div>
          </div>
          <div class="info-item">
            <div class="info-label">Headers de Segurança</div>
            <div class="info-value" style="color: #059669;">5/5 Configurados</div>
            <div class="info-description">Proteção adicional ativa</div>
          </div>
        </div>
      </div>
    `
  }

  // Usar template fornecido ou template padrão
  const templateToUse = (template && template.trim() !== '') ? template : (defaultTemplate || '')

  // Substituir variáveis no template
  const renderPreview = () => {
    if (!templateToUse || templateToUse.trim() === '') {
      return (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center', 
          color: '#999',
          background: '#f9f9f9',
          borderRadius: '8px',
          margin: '20px'
        }}>
          <p style={{ fontSize: '16px', marginBottom: '10px' }}>Carregando template padrão...</p>
          <p style={{ fontSize: '14px' }}>O template padrão profissional será usado quando o relatório for enviado.</p>
        </div>
      )
    }

    let rendered = templateToUse
    Object.keys(previewData).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      rendered = rendered.replace(regex, previewData[key] || '')
    })

    return rendered
  }

  const renderedHTML = renderPreview()

  return (
    <div className="email-preview-wrapper">
      <div className="email-preview-content">
        <iframe
          srcDoc={renderedHTML}
          className="email-preview-iframe"
          title="Report Email Preview"
          sandbox="allow-same-origin"
        />
      </div>
      <div className="email-preview-info">
        <p className="preview-note">
          <strong>📝 Nota:</strong> Esta é uma pré-visualização com dados de exemplo. 
          Os valores reais serão substituídos quando o relatório for enviado.
          {!template || template.trim() === '' ? ' (Mostrando template padrão)' : ''}
        </p>
      </div>
    </div>
  )
}

const Settings = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('general')
  const [editingClient, setEditingClient] = useState(null)
  const [clientForm, setClientForm] = useState({ name: '', email: '', phone: '' })
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    buttonText: 'OK'
  })
  
  const { data: settingsData, isLoading } = useQuery('settings', async () => {
    const response = await api.get('/settings')
    return response.data.data
  })

  // Buscar clientes
  const { data: clientsData } = useQuery('clients', async () => {
    const response = await api.get('/clients')
    return response.data.data
  }, {
    staleTime: 60000 // Cache por 1 minuto
  })

  const [settings, setSettings] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [loadingDefaultTemplate, setLoadingDefaultTemplate] = useState(false)
  const [defaultReportTemplate, setDefaultReportTemplate] = useState(null)

  // Carregar template padrão do backend ao montar o componente
  useEffect(() => {
    const loadDefaultTemplate = async () => {
      try {
        const response = await api.get('/settings/default-report-template')
        if (response.data.success) {
          setDefaultReportTemplate(response.data.data.template)
        }
      } catch (error) {
        console.error('Error loading default template:', error)
      }
    }
    loadDefaultTemplate()
  }, [])

  useEffect(() => {
    if (settingsData) {
      const initialSettings = {}
      Object.keys(settingsData).forEach(key => {
        initialSettings[key] = settingsData[key].value
      })
      setSettings(initialSettings)
    }
  }, [settingsData])

  // Função para carregar template padrão do backend no editor
  const loadDefaultReportTemplate = async () => {
    setLoadingDefaultTemplate(true)
    try {
      const response = await api.get('/settings/default-report-template')
      if (response.data.success) {
        updateSetting('report_email_template', response.data.data.template)
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Sucesso',
          message: 'Template padrão carregado com sucesso! Agora você pode visualizá-lo e editá-lo se desejar.',
          buttonText: 'OK'
        })
      }
    } catch (error) {
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Erro',
        message: `Erro ao carregar template padrão: ${error.response?.data?.message || error.message}`,
        buttonText: 'OK'
      })
    } finally {
      setLoadingDefaultTemplate(false)
    }
  }

  // Função para limpar template e voltar ao padrão
  const clearReportTemplate = () => {
    updateSetting('report_email_template', '')
    setAlertModal({
      isOpen: true,
      type: 'info',
      title: 'Template Limpo',
      message: 'O template foi limpo. O template padrão profissional será usado automaticamente quando os relatórios forem enviados.',
      buttonText: 'OK'
    })
  }

  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const saveMutation = useMutation(
    async (settingsToSave) => {
      const response = await api.put('/settings', { settings: settingsToSave })
      return response.data
    },
    {
      onSuccess: () => {
        setSaveMessage('Configurações salvas com sucesso!')
        queryClient.invalidateQueries('settings')
        setTimeout(() => setSaveMessage(''), 5000)
      },
      onError: (error) => {
        setSaveMessage(`Erro ao salvar: ${error.response?.data?.message || error.message}`)
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
      onSuccess: () => {
        queryClient.invalidateQueries('clients')
        setClientForm({ name: '', email: '', phone: '' })
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
          message: `Erro ao criar cliente: ${error.response?.data?.message || error.message}`,
          buttonText: 'OK'
        })
      }
    }
  )

  // Mutação para atualizar cliente
  const updateClientMutation = useMutation(
    async ({ id, data }) => {
      const response = await api.put(`/clients/${id}`, data)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('clients')
        setEditingClient(null)
        setClientForm({ name: '', email: '', phone: '' })
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Sucesso',
          message: 'Cliente atualizado com sucesso!',
          buttonText: 'OK'
        })
      },
      onError: (error) => {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Erro',
          message: `Erro ao atualizar cliente: ${error.response?.data?.message || error.message}`,
          buttonText: 'OK'
        })
      }
    }
  )

  // Mutação para deletar cliente
  const deleteClientMutation = useMutation(
    async (id) => {
      const response = await api.delete(`/clients/${id}`)
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('clients')
        queryClient.invalidateQueries('sites') // Atualizar sites também, pois podem ter perdido a referência ao cliente
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Sucesso',
          message: 'Cliente removido com sucesso!',
          buttonText: 'OK'
        })
      },
      onError: (error) => {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Erro',
          message: `Erro ao remover cliente: ${error.response?.data?.message || error.message}`,
          buttonText: 'OK'
        })
      }
    }
  )

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage('')
    try {
      const settingsToSave = { ...settings }
      
      
      await saveMutation.mutateAsync(settingsToSave)
    } finally {
      setSaving(false)
    }
  }

  const handleClientSubmit = (e) => {
    e.preventDefault()
    if (!clientForm.name || !clientForm.email) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Atenção',
        message: 'Nome e email são obrigatórios',
        buttonText: 'OK'
      })
      return
    }

    if (editingClient) {
      updateClientMutation.mutate({
        id: editingClient.id,
        data: clientForm
      })
    } else {
      createClientMutation.mutate(clientForm)
    }
  }

  const handleEditClient = (client) => {
    setEditingClient(client)
    setClientForm({
      name: client.name,
      email: client.email,
      phone: client.phone || ''
    })
  }

  const handleCancelEdit = () => {
    setEditingClient(null)
    setClientForm({ name: '', email: '', phone: '' })
  }

  const handleDeleteClient = (id) => {
    if (window.confirm('Deseja remover este cliente? Os sites vinculados a este cliente não serão removidos, mas perderão a referência ao cliente.')) {
      deleteClientMutation.mutate(id)
    }
  }

  if (isLoading) {
    return (
      <div className="settings-page">
        <div className="settings-container">
          <div className="loading-state">Carregando configurações...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-page">
      <nav className="settings-navbar">
        <div className="navbar-content">
          <button className="back-button" onClick={() => navigate('/')}>
            ← Voltar
          </button>
          <h1>Configurações</h1>
        </div>
      </nav>

      <div className="settings-container">
        {saveMessage && (
          <div className={`save-message ${saveMessage.includes('sucesso') ? 'success' : 'error'}`}>
            {saveMessage}
          </div>
        )}

        <div className="settings-layout">
          {/* Sidebar com abas */}
          <div className="settings-sidebar">
            <button
              className={`tab-button ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              <span className="tab-text">Geral</span>
            </button>
            <button
              className={`tab-button ${activeTab === 'clients' ? 'active' : ''}`}
              onClick={() => setActiveTab('clients')}
            >
              <span className="tab-text">Clientes</span>
            </button>
            <button
              className={`tab-button ${activeTab === 'sites' ? 'active' : ''}`}
              onClick={() => setActiveTab('sites')}
            >
              <span className="tab-text">Sites Monitorados</span>
            </button>
            <button
              className={`tab-button ${activeTab === 'email' ? 'active' : ''}`}
              onClick={() => setActiveTab('email')}
            >
              <span className="tab-text">Template de Notificação</span>
            </button>
            <button
              className={`tab-button ${activeTab === 'report' ? 'active' : ''}`}
              onClick={() => setActiveTab('report')}
            >
              <span className="tab-text">Template de Relatório</span>
            </button>
          </div>

          {/* Conteúdo das abas */}
          <div className="settings-content">
            {activeTab === 'general' && (
              <>
                <div className="settings-section">
                  <h2>Notificações por E-mail</h2>
                  <div className="setting-item">
                    <label>
                      <span className="label-text">E-mail para Alertas</span>
                      <span className="label-description">
                        E-mail que receberá os alertas quando problemas forem detectados
                      </span>
                    </label>
                    <input
                      type="email"
                      value={settings.alert_email || ''}
                      onChange={(e) => updateSetting('alert_email', e.target.value)}
                      placeholder="contato@artnaweb.com.br"
                    />
                  </div>
                </div>

                <div className="settings-section">
                  <h2>UptimeRobot</h2>
                  <div className="setting-item checkbox-setting">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={settings.uptimerobot_enabled || false}
                        onChange={(e) => updateSetting('uptimerobot_enabled', e.target.checked)}
                        className="checkbox-input"
                      />
                      <div className="checkbox-content">
                        <span className="label-text">Habilitar Integração com UptimeRobot</span>
                        <span className="label-description">
                          Quando habilitado, os sites serão monitorados para disponibilidade (uptime/downtime)
                        </span>
                      </div>
                    </label>
                  </div>

                  {settings.uptimerobot_enabled && (
                    <div className="setting-item">
                      <label>
                        <span className="label-text">Chave de API do UptimeRobot</span>
                        <span className="label-description">
                          Sua chave de API do UptimeRobot. Obtenha em: https://uptimerobot.com/dashboard#mySettings
                        </span>
                      </label>
                      <input
                        type="password"
                        value={settings.uptimerobot_api_key || ''}
                        onChange={(e) => updateSetting('uptimerobot_api_key', e.target.value)}
                        placeholder="u1234567-abc123def456..."
                      />
                    </div>
                  )}
                </div>

                <div className="settings-section">
                  <h2>Scan Automático</h2>
                  <div className="setting-item checkbox-setting">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={settings.scan_interval_enabled || false}
                        onChange={(e) => updateSetting('scan_interval_enabled', e.target.checked)}
                        className="checkbox-input"
                      />
                      <div className="checkbox-content">
                        <span className="label-text">Habilitar Scan Automático</span>
                        <span className="label-description">
                          Quando habilitado, os sites serão escaneados automaticamente a cada 6 horas
                        </span>
                      </div>
                    </label>
                  </div>

                </div>
              </>
            )}

            {activeTab === 'email' && (
              <>
                <div className="settings-section">
                  <h2>Template de Email de Notificações</h2>
                  <div className="setting-item">
                    <label>
                      <span className="label-text">Assunto do Email</span>
                      <span className="label-description">
                        Use {`{{domain}}`} para incluir o domínio e {`{{status}}`} para incluir o status
                      </span>
                    </label>
                    <input
                      type="text"
                      value={settings.email_subject || '[Alerta] Problema detectado em {{domain}}'}
                      onChange={(e) => updateSetting('email_subject', e.target.value)}
                      placeholder="[Alerta] Problema detectado em {{domain}}"
                    />
                  </div>

                  <div className="setting-item">
                    <label>
                      <span className="label-text">Template HTML do Email</span>
                      <span className="label-description">
                        Use as variáveis: {`{{domain}}`}, {`{{status}}`}, {`{{statusText}}`}, {`{{scanDate}}`}, {`{{warnings}}`}, {`{{malware}}`}, {`{{details}}`}
                      </span>
                    </label>
                    <EmailTemplateEditor
                      value={settings.email_template || ''}
                      onChange={(value) => updateSetting('email_template', value)}
                      placeholder="Digite o template HTML do email..."
                    />
                  </div>

                  <div className="template-variables">
                    <h3>Variáveis Disponíveis:</h3>
                    <ul>
                      <li><code>{`{{domain}}`}</code> - Domínio do site</li>
                      <li><code>{`{{status}}`}</code> - Status (clean, warning, infected, unknown)</li>
                      <li><code>{`{{statusText}}`}</code> - Status em português (Limpo, Verificar, Infectado, Desconhecido)</li>
                      <li><code>{`{{scanDate}}`}</code> - Data e hora da varredura</li>
                      <li><code>{`{{warnings}}`}</code> - Lista de avisos (HTML)</li>
                      <li><code>{`{{malware}}`}</code> - Lista de malware detectado (HTML)</li>
                      <li><code>{`{{details}}`}</code> - Detalhes completos em JSON (formatado)</li>
                    </ul>
                  </div>

                  <div className="setting-item">
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        const defaultTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #667eea; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
    .alert { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .danger { background: #f8d7da; border: 1px solid #dc3545; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .info { background: #d1ecf1; border: 1px solid #0c5460; padding: 15px; border-radius: 5px; margin: 15px 0; }
    ul { margin: 10px 0; padding-left: 20px; }
    pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Alerta de Monitoramento - ArtnaWEB Monitor</h2>
    </div>
    <div class="content">
      <p><strong>Domínio:</strong> {{domain}}</p>
      <p><strong>Status:</strong> <span style="font-weight: bold; color: #dc3545;">{{statusText}}</span></p>
      <p><strong>Data da Varredura:</strong> {{scanDate}}</p>
      
      {{warnings}}
      {{malware}}
      
      <h3>Detalhes da Varredura:</h3>
      <pre>{{details}}</pre>
      
      <div class="footer">
        <p>Este é um e-mail automático do sistema ArtnaWEB Monitor.</p>
        <p>Por favor, não responda este e-mail.</p>
      </div>
    </div>
  </div>
</body>
</html>`
                        updateSetting('email_template', defaultTemplate)
                      }}
                    >
                      Usar Template Padrão
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'report' && (
              <>
                <div className="settings-section">
                  <h2>Relatórios Automáticos</h2>
                  <div className="setting-item checkbox-setting">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={settings.report_interval_enabled === '1' || settings.report_interval_enabled === 'true'}
                        onChange={(e) => updateSetting('report_interval_enabled', e.target.checked ? '1' : '0')}
                        className="checkbox-input"
                      />
                      <div className="checkbox-content">
                        <span className="label-text">Habilitar Envio Automático de Relatórios</span>
                        <span className="label-description">
                          Quando habilitado, os relatórios serão enviados automaticamente para os clientes em intervalos definidos
                        </span>
                      </div>
                    </label>
                  </div>

                  {settings.report_interval_enabled === '1' || settings.report_interval_enabled === 'true' ? (
                    <div className="setting-item">
                      <label>
                        <span className="label-text">Intervalo de Envio</span>
                        <span className="label-description">
                          Com que frequência os relatórios devem ser enviados
                        </span>
                      </label>
                      <div className="interval-inputs">
                        <input
                          type="number"
                          min="1"
                          value={settings.report_interval_value || 7}
                          onChange={(e) => updateSetting('report_interval_value', parseInt(e.target.value) || 1)}
                          className="interval-value"
                        />
                        <select
                          value={settings.report_interval_unit || 'days'}
                          onChange={(e) => updateSetting('report_interval_unit', e.target.value)}
                          className="interval-unit"
                        >
                          <option value="minutes">Minutos</option>
                          <option value="hours">Horas</option>
                          <option value="days">Dias</option>
                        </select>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="settings-section">
                  <h2>Template de Email de Relatórios</h2>
                  <div className="setting-item">
                    <label>
                      <span className="label-text">Assunto do Email</span>
                      <span className="label-description">
                        Use {`{{clientName}}`} para incluir o nome do cliente
                      </span>
                    </label>
                    <input
                      type="text"
                      value={settings.report_email_subject || 'Relatório de Monitoramento - {{clientName}}'}
                      onChange={(e) => updateSetting('report_email_subject', e.target.value)}
                      placeholder="Relatório de Monitoramento - {{clientName}}"
                    />
                  </div>

                  <div className="setting-item">
                    <label>
                      <span className="label-text">Template HTML do Email</span>
                      <span className="label-description">
                        Use as variáveis: {`{{clientName}}`}, {`{{clientEmail}}`}, {`{{clientPhone}}`}, {`{{sitesList}}`}, {`{{reportDate}}`}, {`{{totalSites}}`}
                      </span>
                    </label>
                    <EmailTemplateEditor
                      value={settings.report_email_template || ''}
                      onChange={(value) => updateSetting('report_email_template', value)}
                      placeholder="Digite o template HTML do email de relatório..."
                    />
                  </div>

                  <div className="setting-item">
                    <div className="variables-info">
                      <strong>Variáveis disponíveis:</strong>
                      <ul>
                        <li><code>{`{{clientName}}`}</code> - Nome do cliente</li>
                        <li><code>{`{{clientEmail}}`}</code> - Email do cliente</li>
                        <li><code>{`{{clientPhone}}`}</code> - Telefone do cliente</li>
                        <li><code>{`{{sitesList}}`}</code> - Lista de sites com seus status (HTML formatado)</li>
                        <li><code>{`{{reportDate}}`}</code> - Data e hora do relatório</li>
                        <li><code>{`{{totalSites}}`}</code> - Total de sites no relatório</li>
                      </ul>
                    </div>
                  </div>

                  <div className="setting-item">
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={loadDefaultReportTemplate}
                        disabled={loadingDefaultTemplate}
                      >
                        {loadingDefaultTemplate ? 'Carregando...' : '📥 Carregar Template Padrão'}
                      </button>
                      {settings.report_email_template && settings.report_email_template.trim() !== '' && (
                        <button
                          className="btn btn-secondary"
                          onClick={clearReportTemplate}
                          style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                        >
                          🗑️ Limpar Template
                        </button>
                      )}
                    </div>
                    <p style={{ marginTop: '10px', fontSize: '13px', color: '#999', fontStyle: 'italic' }}>
                      {settings.report_email_template && settings.report_email_template.trim() !== '' 
                        ? '✅ Um template personalizado está definido. Clique em "Carregar Template Padrão" para ver/editar o template profissional padrão, ou "Limpar Template" para voltar a usar o padrão automaticamente.' 
                        : 'ℹ️ Nenhum template personalizado definido. O template padrão profissional será usado automaticamente quando os relatórios forem enviados. Clique em "Carregar Template Padrão" para visualizá-lo e editá-lo se desejar.'}
                    </p>
                  </div>
                  
                  {/* Preview do Template */}
                  {defaultReportTemplate && (
                    <div className="setting-item">
                      <label>
                        <span className="label-text">Preview do Template</span>
                        <span className="label-description">
                          Visualização do template de relatório (com dados de exemplo)
                        </span>
                      </label>
                      <ReportEmailPreview 
                        template={settings.report_email_template || ''} 
                        defaultTemplate={defaultReportTemplate}
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'clients' && (
              <>
                <div className="settings-section">
                  <h2>Gerenciar Clientes</h2>
                  
                  {/* Formulário de Cliente */}
                  <div style={{ marginBottom: '30px', padding: '20px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <h3 style={{ marginTop: '0', marginBottom: '20px' }}>{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                    <form onSubmit={handleClientSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Nome *</label>
                          <input
                            type="text"
                            placeholder="Nome do cliente"
                            value={clientForm.name}
                            onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                            disabled={createClientMutation.isLoading || updateClientMutation.isLoading}
                            required
                            style={{ width: '100%', padding: '10px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '6px', color: '#e0e0e0', fontSize: '14px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Email *</label>
                          <input
                            type="email"
                            placeholder="email@exemplo.com"
                            value={clientForm.email}
                            onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                            disabled={createClientMutation.isLoading || updateClientMutation.isLoading}
                            required
                            style={{ width: '100%', padding: '10px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '6px', color: '#e0e0e0', fontSize: '14px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Telefone</label>
                          <input
                            type="text"
                            placeholder="(11) 99999-9999"
                            value={clientForm.phone}
                            onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                            disabled={createClientMutation.isLoading || updateClientMutation.isLoading}
                            style={{ width: '100%', padding: '10px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '6px', color: '#e0e0e0', fontSize: '14px' }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button 
                          type="submit" 
                          disabled={createClientMutation.isLoading || updateClientMutation.isLoading}
                          style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none', borderRadius: '6px', color: 'white', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}
                        >
                          {createClientMutation.isLoading || updateClientMutation.isLoading 
                            ? 'Salvando...' 
                            : editingClient ? 'Atualizar' : 'Criar Cliente'}
                        </button>
                        {editingClient && (
                          <button 
                            type="button"
                            onClick={handleCancelEdit}
                            style={{ padding: '10px 20px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '6px', color: '#e0e0e0', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </form>
                  </div>

                  {/* Lista de Clientes */}
                  <div style={{ marginTop: '30px' }}>
                    <h3 style={{ marginBottom: '20px' }}>Lista de Clientes</h3>
                    {clientsData && clientsData.length > 0 ? (
                      <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                            <tr>
                              <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#b0b0b0', borderBottom: '2px solid rgba(255, 255, 255, 0.1)' }}>Nome</th>
                              <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#b0b0b0', borderBottom: '2px solid rgba(255, 255, 255, 0.1)' }}>Email</th>
                              <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#b0b0b0', borderBottom: '2px solid rgba(255, 255, 255, 0.1)' }}>Telefone</th>
                              <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#b0b0b0', borderBottom: '2px solid rgba(255, 255, 255, 0.1)' }}>Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {clientsData.map((client) => (
                              <tr 
                                key={client.id} 
                                style={{ 
                                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                  transition: 'background 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <td style={{ padding: '15px', color: '#e0e0e0' }}><strong>{client.name}</strong></td>
                                <td style={{ padding: '15px', color: '#e0e0e0' }}>{client.email}</td>
                                <td style={{ padding: '15px', color: '#e0e0e0' }}>{client.phone || '-'}</td>
                                <td style={{ padding: '15px' }}>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button
                                      onClick={() => handleEditClient(client)}
                                      disabled={deleteClientMutation.isLoading}
                                      title="Editar cliente"
                                      style={{ width: '36px', height: '36px', padding: '0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px', transition: 'all 0.3s ease' }}
                                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                      <FontAwesomeIcon icon={faEdit} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteClient(client.id)}
                                      disabled={deleteClientMutation.isLoading}
                                      title="Remover cliente"
                                      style={{ width: '36px', height: '36px', padding: '0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', background: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px', transition: 'all 0.3s ease' }}
                                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                      <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ padding: '40px', textAlign: 'center', color: '#999', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <p>Nenhum cliente cadastrado. Crie um cliente para começar.</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'sites' && (
              <>
                <div className="settings-section">
                  <h2>Sites Monitorados</h2>
                  <p style={{ marginBottom: '20px', color: '#999', fontSize: '14px' }}>
                    Configure o monitoramento Wordfence para sites WordPress. Cada site precisa de sua própria API key do Wordfence.
                  </p>
                  
                  <SitesWordfenceConfig />
                </div>
              </>
            )}

            {(activeTab === 'general' || activeTab === 'email' || activeTab === 'report') && (
              <div className="settings-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : 'Salvar Configurações'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => navigate('/')}
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Alerta */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        buttonText={alertModal.buttonText}
      />
    </div>
  )
}

export default Settings
