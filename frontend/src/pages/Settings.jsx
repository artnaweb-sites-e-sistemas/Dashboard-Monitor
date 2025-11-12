import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEdit, faTrash, faDownload } from '@fortawesome/free-solid-svg-icons'
import api from '../services/api'
import EmailTemplateEditor from '../components/EmailTemplateEditor'
import EmailChipsInput from '../components/EmailChipsInput'
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
  const [clientConfigs, setClientConfigs] = useState({})
  const [savingSiteId, setSavingSiteId] = useState(null)
  const [savingClientSiteId, setSavingClientSiteId] = useState(null)
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '' })
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

  // Buscar clientes
  const { data: clientsData } = useQuery('clients', async () => {
    const response = await api.get('/clients')
    return response.data.data
  }, {
    staleTime: 60000
  })

  // Inicializar configurações quando sites carregarem
  useEffect(() => {
    if (sitesData) {
      const configs = {}
      const clientConfigs = {}
      sitesData.forEach(site => {
        configs[site.id] = {
          wordfence_enabled: site.wordfence_enabled || false,
          wordfence_api_key: site.wordfence_api_key || ''
        }
        clientConfigs[site.id] = {
          client_id: site.client?.id || ''
        }
      })
      setWordfenceConfigs(configs)
      setClientConfigs(clientConfigs)
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

  // Mutação para atualizar cliente vinculado
  const updateClientMutation = useMutation(
    async ({ siteId, client_id }) => {
      const response = await api.put(`/sites/${siteId}/client`, { client_id: client_id || null })
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('sites')
        setSavingClientSiteId(null)
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Sucesso',
          message: 'Cliente vinculado atualizado com sucesso!',
          buttonText: 'OK'
        })
      },
      onError: (error) => {
        setSavingClientSiteId(null)
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Erro',
          message: error.response?.data?.message || 'Erro ao atualizar cliente vinculado',
          buttonText: 'OK'
        })
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
        queryClient.invalidateQueries('clients')
        // Após criar o cliente, vincular automaticamente ao site expandido
        if (expandedSiteId && data.data?.id) {
          updateClientConfig(expandedSiteId, data.data.id.toString())
          // Opcionalmente, salvar automaticamente
          setTimeout(() => {
            updateClientMutation.mutate({
              siteId: expandedSiteId,
              client_id: data.data.id.toString()
            })
          }, 500)
        }
        setShowNewClientModal(false)
        setNewClient({ name: '', email: '', phone: '' })
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

  const handleSaveClient = (siteId) => {
    const clientConfig = clientConfigs[siteId]
    if (!clientConfig) return

    setSavingClientSiteId(siteId)
    updateClientMutation.mutate({
      siteId,
      client_id: clientConfig.client_id || null
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

  const updateClientConfig = (siteId, client_id) => {
    setClientConfigs(prev => ({
      ...prev,
      [siteId]: {
        client_id: client_id || ''
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
                  <div style={{ fontSize: '13px', color: '#999', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span>Status: <strong style={{ color: site.last_status === 'clean' ? '#10b981' : site.last_status === 'warning' ? '#f59e0b' : '#ef4444' }}>
                      {site.last_status === 'clean' ? 'Verificado' : site.last_status === 'warning' ? 'Verificar' : site.last_status === 'infected' ? 'Infectado' : 'Desconhecido'}
                    </strong></span>
                    {site.client && (
                      <span style={{ color: '#667eea' }}>👤 Cliente: {site.client.name}</span>
                    )}
                    {!site.client && (
                      <span style={{ color: '#999', fontStyle: 'italic' }}>Sem cliente vinculado</span>
                    )}
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
                  {/* Seção de Cliente Vinculado */}
                  <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', fontWeight: '600', color: '#e0e0e0' }}>
                      Cliente Vinculado
                    </h4>
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#e0e0e0' }}>
                        Cliente
                      </label>
                      <select
                        value={clientConfigs[site.id]?.client_id || ''}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === 'new') {
                            setShowNewClientModal(true)
                            setExpandedSiteId(site.id) // Manter expandido
                          } else {
                            updateClientConfig(site.id, value)
                          }
                        }}
                        disabled={savingClientSiteId === site.id}
                        style={{ 
                          width: '100%', 
                          padding: '12px 14px', 
                          background: 'rgba(255, 255, 255, 0.05)', 
                          border: '1px solid rgba(255, 255, 255, 0.2)', 
                          borderRadius: '8px', 
                          color: '#e0e0e0', 
                          fontSize: '14px',
                          cursor: savingClientSiteId === site.id ? 'not-allowed' : 'pointer',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
                          transition: 'all 0.3s ease',
                          outline: 'none',
                          appearance: 'none',
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23e0e0e0' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 12px center',
                          backgroundSize: '12px',
                          paddingRight: '36px'
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
                        onMouseEnter={(e) => {
                          if (savingClientSiteId !== site.id) {
                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)'
                            e.target.style.background = 'rgba(255, 255, 255, 0.08)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (document.activeElement !== e.target) {
                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                            e.target.style.background = 'rgba(255, 255, 255, 0.05)'
                          }
                        }}
                      >
                        <option value="" style={{ background: '#1a1a1a', color: '#999' }}>Nenhum cliente</option>
                        {clientsData && clientsData.map(client => (
                          <option key={client.id} value={client.id} style={{ background: '#1a1a1a', color: '#e0e0e0' }}>
                            {client.name} {client.email && `(${client.email.split(',')[0]})`}
                          </option>
                        ))}
                        <option value="new" style={{ background: '#1a1a1a', fontWeight: '600', color: '#667eea' }}>
                          + Novo Cliente
                        </option>
                      </select>
                      <p style={{ marginTop: '8px', fontSize: '12px', color: '#999', lineHeight: '1.5' }}>
                        Selecione o cliente que receberá os relatórios deste site. Você pode criar um novo cliente se necessário.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleSaveClient(site.id)}
                        disabled={savingClientSiteId === site.id}
                        style={{ 
                          padding: '8px 16px', 
                          background: savingClientSiteId === site.id
                            ? 'rgba(102, 126, 234, 0.5)' 
                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                          border: 'none', 
                          borderRadius: '6px', 
                          color: 'white', 
                          fontWeight: '600', 
                          cursor: savingClientSiteId === site.id ? 'not-allowed' : 'pointer', 
                          fontSize: '13px' 
                        }}
                      >
                        {savingClientSiteId === site.id ? 'Salvando...' : 'Salvar Cliente'}
                      </button>
                    </div>
                  </div>

                  {/* Seção de Configuração Wordfence */}
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', fontWeight: '600', color: '#e0e0e0' }}>
                      Configuração Wordfence
                    </h4>
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
                  </div>

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <button
                      onClick={() => setExpandedSiteId(null)}
                      disabled={isSaving || savingClientSiteId === site.id}
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
                      Fechar
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
                      {isSaving ? 'Salvando...' : 'Salvar Wordfence'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

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
                // Validar se há pelo menos um email
                const emails = newClient.email ? newClient.email.split(',').map(e => e.trim()).filter(e => e) : []
                if (newClient.name && emails.length > 0) {
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
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#b0b0b0', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>E-mails *</label>
                  <EmailChipsInput
                    value={newClient.email || ''}
                    onChange={(value) => setNewClient({ ...newClient, email: value })}
                    placeholder="Digite um email e pressione Enter"
                    disabled={createClientMutation.isLoading}
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
                    disabled={createClientMutation.isLoading || !newClient.name || !newClient.email || newClient.email.split(',').map(e => e.trim()).filter(e => e).length === 0}
                  >
                    {createClientMutation.isLoading ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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
        // Invalidar cache do ReportModal para que ele use o novo template
        queryClient.invalidateQueries('reportSettings')
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
        queryClient.invalidateQueries('reportSettings') // Invalidar cache do ReportModal também
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
    if (!clientForm.name || !clientForm.email || clientForm.email.trim() === '') {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Atenção',
        message: 'Nome e pelo menos um email são obrigatórios',
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
                      <span className="label-text">E-mails para Alertas</span>
                      <span className="label-description">
                        E-mails que receberão os alertas quando problemas forem detectados. Você pode adicionar múltiplos e-mails.
                      </span>
                    </label>
                    <EmailChipsInput
                      value={settings.alert_email || ''}
                      onChange={(value) => updateSetting('alert_email', value)}
                      placeholder="Digite um email e pressione Enter"
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

                <div className="settings-section">
                  <h2>Plugin WordPress</h2>
                  <div className="setting-item">
                    <label>
                      <span className="label-text">Plugin ArtnaWEB Monitor</span>
                      <span className="label-description">
                        Baixe o plugin WordPress para conectar seu site ao sistema de monitoramento. 
                        Após o download, instale o plugin no WordPress e configure a chave de API.
                      </span>
                    </label>
                    <div style={{ marginTop: '15px' }}>
                      <a
                        href={(() => {
                          // Em produção, VITE_API_URL já inclui /api no final
                          // Em desenvolvimento, usa /api (proxy do Vite)
                          const isProd = import.meta.env.PROD || window.location.hostname !== 'localhost';
                          const apiUrl = import.meta.env.VITE_API_URL;
                          
                          if (isProd && apiUrl) {
                            // Produção: VITE_API_URL já é a URL completa com /api
                            return `${apiUrl}/plugin/download`;
                          }
                          // Desenvolvimento: usa /api (proxy)
                          return '/api/plugin/download';
                        })()}
                        download="artnaweb-monitor-plugin.zip"
                        className="btn btn-primary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          textDecoration: 'none'
                        }}
                      >
                        <FontAwesomeIcon icon={faDownload} />
                        Baixar Plugin WordPress
                      </a>
                    </div>
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
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={loadDefaultReportTemplate}
                        disabled={loadingDefaultTemplate}
                      >
                        {loadingDefaultTemplate ? 'Carregando...' : 'Carregar Template Padrão'}
                      </button>
                    </div>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
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
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>E-mails *</label>
                          <span style={{ display: 'block', fontSize: '12px', color: '#b0b0b0', marginBottom: '8px' }}>
                            E-mails que receberão os relatórios. Você pode adicionar múltiplos e-mails.
                          </span>
                          <EmailChipsInput
                            value={clientForm.email || ''}
                            onChange={(value) => setClientForm({ ...clientForm, email: value })}
                            placeholder="Digite um email e pressione Enter"
                            disabled={createClientMutation.isLoading || updateClientMutation.isLoading}
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
                                <td style={{ padding: '15px', color: '#e0e0e0' }}>
                                {client.email && client.email.includes(',') ? (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {client.email.split(',').map((email, idx) => (
                                      <span 
                                        key={idx}
                                        style={{
                                          display: 'inline-block',
                                          padding: '4px 8px',
                                          background: 'rgba(102, 126, 234, 0.2)',
                                          borderRadius: '4px',
                                          fontSize: '12px',
                                          marginRight: '4px'
                                        }}
                                      >
                                        {email.trim()}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  client.email
                                )}
                              </td>
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
