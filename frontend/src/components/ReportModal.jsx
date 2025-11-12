import React, { useState, useEffect, useRef } from 'react'
import { useQuery } from 'react-query'
import api from '../services/api'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faSpinner, 
  faEye, 
  faCode, 
  faExclamationCircle,
  faBold,
  faItalic,
  faUnderline,
  faStrikethrough,
  faAlignLeft,
  faAlignCenter,
  faAlignRight,
  faAlignJustify,
  faListUl,
  faListOl,
  faLink,
  faPalette,
  faFill
} from '@fortawesome/free-solid-svg-icons'
import EmailChipsInput from './EmailChipsInput'
import AlertModal from './AlertModal'
import './ScanDetailsModal.css'
import './ReportModal.css'

const ReportModal = ({ siteId, onClose, onSend }) => {
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [editorMode, setEditorMode] = useState('visual') // 'visual' ou 'html'
  const iframeRef = useRef(null)
  const htmlEditorRef = useRef(null)
  const isUpdatingIframeRef = useRef(false) // Flag para evitar loops de atualização
  const [toolbarState, setToolbarState] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    fontSize: '3',
    fontColor: '#000000',
    backgroundColor: '#ffffff'
  })
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    type: 'warning',
    title: '',
    message: '',
    buttonText: 'OK'
  })

  // Buscar dados do site e cliente
  const { data: siteData, isLoading: siteLoading } = useQuery(
    ['site', siteId],
    async () => {
      const response = await api.get(`/sites/${siteId}`)
      return response.data.data
    },
    {
      enabled: !!siteId,
      staleTime: 30000
    }
  )

  // Buscar configurações de email de relatório e template padrão
  const { data: settingsData } = useQuery(
    'reportSettings',
    async () => {
      const response = await api.get('/settings')
      const settings = response.data.data
      
      // Buscar template padrão do backend se não houver template personalizado
      let template = settings.report_email_template?.value || settings.report_email_template || ''
      if (!template || template.trim() === '') {
        try {
          const defaultTemplateResponse = await api.get('/settings/default-report-template')
          if (defaultTemplateResponse.data.success) {
            template = defaultTemplateResponse.data.data.template
            console.log('[ReportModal] Template padrão carregado do backend')
          }
        } catch (error) {
          console.error('[ReportModal] Erro ao carregar template padrão:', error)
        }
      }
      
      // A API retorna um objeto, não um array
      return {
        subject: settings.report_email_subject?.value || settings.report_email_subject || 'Relatório de Monitoramento - {{clientName}}',
        template: template
      }
    },
    {
      enabled: !!siteId,
      staleTime: 60000
    }
  )

  // Buscar siteCard HTML formatado do backend (formato profissional)
  const { data: siteCardData } = useQuery(
    ['siteCardPreview', siteId],
    async () => {
      const response = await api.get(`/reports/preview/site/${siteId}`)
      return response.data.data
    },
    {
      enabled: !!siteId,
      staleTime: 30000
    }
  )

  // Obter o documento do iframe
  const getIframeDoc = () => {
    if (!iframeRef.current) return null
    return iframeRef.current.contentDocument || iframeRef.current.contentWindow.document
  }

  // Obter a janela do iframe
  const getIframeWindow = () => {
    if (!iframeRef.current) return null
    return iframeRef.current.contentWindow
  }

  // Converter RGB para Hex
  const rgbToHex = (rgb) => {
    const result = rgb.match(/\d+/g)
    if (!result || result.length < 3) return '#000000'
    return '#' + result.map(x => {
      const hex = parseInt(x).toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }).join('')
  }

  // Atualizar estado da toolbar baseado na seleção
  const updateToolbarState = () => {
    const iframeDoc = getIframeDoc()
    const iframeWindow = getIframeWindow()
    if (!iframeDoc || !iframeWindow) return
    
    try {
      // Focar no iframe para poder executar comandos
      iframeWindow.focus()
      
      // Obter valores dos comandos
      const bold = iframeDoc.queryCommandState('bold')
      const italic = iframeDoc.queryCommandState('italic')
      const underline = iframeDoc.queryCommandState('underline')
      const strikethrough = iframeDoc.queryCommandState('strikeThrough')
      const fontSize = iframeDoc.queryCommandValue('fontSize') || '3'
      
      // Para cores, o execCommand retorna valores em formato RGB ou hex
      // Precisamos converter para hex se necessário
      let fontColor = iframeDoc.queryCommandValue('foreColor') || '#000000'
      let backgroundColor = iframeDoc.queryCommandValue('backColor') || '#ffffff'
      
      // Converter RGB para hex se necessário
      if (fontColor.startsWith('rgb')) {
        fontColor = rgbToHex(fontColor)
      } else if (!fontColor.startsWith('#')) {
        fontColor = '#' + fontColor
      }
      
      if (backgroundColor.startsWith('rgb')) {
        backgroundColor = rgbToHex(backgroundColor)
      } else if (!backgroundColor.startsWith('#')) {
        backgroundColor = '#' + backgroundColor
      }
      
      setToolbarState({
        bold,
        italic,
        underline,
        strikethrough,
        fontSize,
        fontColor,
        backgroundColor
      })
    } catch (error) {
      // Ignorar erros ao verificar estado
    }
  }

  // Executar comando de formatação
  const executeCommand = (command, value = null) => {
    const iframeDoc = getIframeDoc()
    const iframeWindow = getIframeWindow()
    
    if (!iframeDoc || !iframeWindow) return
    
    // Focar no iframe primeiro
    iframeWindow.focus()
    
    try {
      if (value !== null) {
        iframeDoc.execCommand(command, false, value)
      } else {
        iframeDoc.execCommand(command, false, null)
      }
      
      // Atualizar estado da toolbar
      updateToolbarState()
      
      // Disparar evento de input para sincronizar
      if (iframeDoc.body) {
        const inputEvent = new Event('input', { bubbles: true })
        iframeDoc.body.dispatchEvent(inputEvent)
      }
    } catch (error) {
      console.error('Erro ao executar comando:', command, error)
    }
  }

  // Handler para mudança de cor de texto
  const handleFontColorChange = (e) => {
    const color = e.target.value
    // execCommand precisa da cor sem o #
    executeCommand('foreColor', color.replace('#', ''))
    // Atualizar estado manualmente
    setToolbarState(prev => ({ ...prev, fontColor: color }))
  }

  // Handler para mudança de cor de fundo
  const handleBackgroundColorChange = (e) => {
    const color = e.target.value
    // execCommand precisa da cor sem o #
    executeCommand('backColor', color.replace('#', ''))
    // Atualizar estado manualmente
    setToolbarState(prev => ({ ...prev, backgroundColor: color }))
  }

  // Handler para mudança de tamanho da fonte
  const handleFontSizeChange = (e) => {
    const size = e.target.value
    executeCommand('fontSize', size)
  }

  // Handler para inserir link
  const handleInsertLink = () => {
    const iframeDoc = getIframeDoc()
    if (!iframeDoc) return
    
    const url = prompt('Digite a URL do link:')
    if (url) {
      executeCommand('createLink', url)
    }
  }

  // Gerar preview do email quando os dados estiverem disponíveis
  useEffect(() => {
    if (siteData && settingsData && siteCardData) {
      console.log('[ReportModal] Dados do site:', siteData)
      console.log('[ReportModal] Configurações:', settingsData)
      console.log('[ReportModal] SiteCard HTML:', siteCardData.siteCardHtml ? 'Carregado' : 'Não carregado')
      
      const clientName = siteData.client?.name || 'Cliente'
      const clientEmail = siteData.client?.email || ''
      const clientPhone = siteData.client?.phone || ''
      const domain = siteData.domain || ''
      
      console.log('[ReportModal] Cliente:', { clientName, clientEmail, clientPhone })
      console.log('[ReportModal] Template recebido:', settingsData.template ? 'SIM' : 'NÃO', settingsData.template?.substring(0, 100))
      console.log('[ReportModal] Status do site:', siteData.last_status)
      
      // Processar template com variáveis
      let processedSubject = (settingsData.subject || 'Relatório de Monitoramento - {{clientName}}')
        .replace(/\{\{clientName\}\}/g, clientName)
        .replace(/\{\{domain\}\}/g, domain)
      
      // Usar siteCard HTML formatado do backend (formato profissional)
      // O backend ocultará informações preocupantes quando o status não for 'clean'
      const siteCardHtml = siteCardData.siteCardHtml || ''
      
      // Se não houver siteCard, mostrar mensagem de erro
      if (!siteCardHtml || siteCardHtml.trim() === '') {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Erro',
          message: 'Não foi possível gerar o preview do relatório. Tente novamente.',
          buttonText: 'OK'
        })
        return
      }
      
      // Usar template do settingsData (já inclui template padrão se não houver personalizado)
      let template = settingsData.template
      if (!template || template.trim() === '') {
        console.log('[ReportModal] Template ainda vazio após busca, isso não deveria acontecer')
        // Fallback apenas se realmente não conseguir carregar do backend
        template = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: #667eea; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
    .site-card { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #667eea; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Relatório de Monitoramento - ArtnaWEB Monitor</h2>
    </div>
    <div class="content">
      <p>Olá <strong>{{clientName}}</strong>,</p>
      <p>Segue o relatório de monitoramento dos seus sites:</p>
      {{sitesList}}
      <div class="footer">
        <p>Este é um relatório automático do sistema ArtnaWEB Monitor.</p>
      </div>
    </div>
  </div>
</body>
</html>`
      }
      
      console.log('[ReportModal] Template a ser usado:', template.substring(0, 200) + '...')
      console.log('[ReportModal] SiteCard HTML a ser inserido:', siteCardHtml.substring(0, 200) + '...')
      
      let processedBody = template
        .replace(/\{\{clientName\}\}/g, clientName)
        .replace(/\{\{clientEmail\}\}/g, clientEmail)
        .replace(/\{\{clientPhone\}\}/g, clientPhone)
        .replace(/\{\{domain\}\}/g, domain)
        .replace(/\{\{sitesList\}\}/g, siteCardHtml)
        .replace(/\{\{reportDate\}\}/g, new Date().toLocaleString('pt-BR'))
        .replace(/\{\{totalSites\}\}/g, '1')
      
      console.log('[ReportModal] Email processado:', { email: clientEmail, subject: processedSubject, bodyLength: processedBody.length })
      
      setEmail(clientEmail)
      setSubject(processedSubject)
      setBody(processedBody)
    }
  }, [siteData, settingsData, siteCardData])

  // Atualizar iframe quando body mudar OU quando mudar para modo visual
  useEffect(() => {
    if (editorMode === 'visual' && iframeRef.current) {
      if (!body) return
      
      // Se estamos atualizando programaticamente, pular
      if (isUpdatingIframeRef.current) {
        isUpdatingIframeRef.current = false
        return
      }
      
      try {
        const iframe = iframeRef.current
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
        
        // Obter o HTML atual do iframe para comparar (apenas body content)
        const currentBodyContent = iframeDoc.body?.innerHTML || ''
        const newBodyMatch = body.match(/<body[^>]*>([\s\S]*)<\/body>/i)
        const newBodyContent = newBodyMatch ? newBodyMatch[1] : body
        
        // Só atualizar se o conteúdo mudou significativamente
        if (currentBodyContent.trim() !== newBodyContent.trim()) {
          iframeDoc.open()
          iframeDoc.write(body)
          iframeDoc.close()
        }
        
        // Tornar o conteúdo editável após um pequeno delay
        setTimeout(() => {
          try {
            if (iframeDoc.body) {
              iframeDoc.body.contentEditable = 'true'
              iframeDoc.body.style.outline = 'none'
              iframeDoc.body.style.minHeight = '500px'
              iframeDoc.body.style.padding = '20px'
              iframeDoc.body.style.cursor = 'text'
              
              // Remover listeners antigos se existirem
              const oldHandler = iframeDoc.body._inputHandler
              const oldPasteHandler = iframeDoc.body._pasteHandler
              if (oldHandler) {
                iframeDoc.body.removeEventListener('input', oldHandler)
                iframeDoc.body.removeEventListener('blur', oldHandler)
              }
              if (oldPasteHandler) {
                iframeDoc.body.removeEventListener('paste', oldPasteHandler)
              }
              
              // Criar novo handler com debounce
              let updateTimeout = null
              const handleInput = () => {
                // Debounce para evitar muitas atualizações
                if (updateTimeout) {
                  clearTimeout(updateTimeout)
                }
                
                updateTimeout = setTimeout(() => {
                  try {
                    // Marcar que estamos atualizando programaticamente
                    isUpdatingIframeRef.current = true
                    
                    // Extrair apenas o conteúdo do body
                    const bodyContent = iframeDoc.body.innerHTML
                    
                    // Reconstruir o HTML completo mantendo head e estrutura
                    // Extrair o head do HTML original
                    const headMatch = body.match(/<head[^>]*>([\s\S]*)<\/head>/i)
                    const headContent = headMatch ? headMatch[0] : '<head><meta charset="UTF-8"></head>'
                    
                    // Reconstruir o HTML
                    const newHtml = `<!DOCTYPE html>
<html>
${headContent}
<body>
${bodyContent}
</body>
</html>`
                    
                    setBody(newHtml)
                  } catch (error) {
                    console.error('Erro ao sincronizar conteúdo visual:', error)
                    isUpdatingIframeRef.current = false
                  }
                }, 300) // Debounce de 300ms
              }
              
              // Handler para paste - deixar o navegador lidar, mas capturar a mudança
              const handlePaste = () => {
                // O evento input será disparado após o paste
                setTimeout(handleInput, 100)
              }
              
              // Armazenar referências dos handlers
              iframeDoc.body._inputHandler = handleInput
              iframeDoc.body._pasteHandler = handlePaste
              
              // Adicionar listeners
              iframeDoc.body.addEventListener('input', handleInput)
              iframeDoc.body.addEventListener('blur', handleInput)
              iframeDoc.body.addEventListener('paste', handlePaste)
              
              // Adicionar listeners para atualizar toolbar quando seleção mudar
              const handleSelectionChange = () => {
                setTimeout(() => updateToolbarState(), 50)
              }
              iframeDoc.addEventListener('selectionchange', handleSelectionChange)
              iframeDoc.addEventListener('mouseup', handleSelectionChange)
              iframeDoc.addEventListener('keyup', handleSelectionChange)
              iframeDoc.addEventListener('click', handleSelectionChange)
            }
          } catch (error) {
            console.error('Erro ao tornar iframe editável:', error)
            isUpdatingIframeRef.current = false
          }
        }, 200)
      } catch (error) {
        console.error('Erro ao atualizar iframe:', error)
        isUpdatingIframeRef.current = false
      }
    }
  }, [body, editorMode])

  // Handler para mudança no editor HTML
  const handleHtmlChange = (e) => {
    setBody(e.target.value)
  }

  // Alternar entre modos
  const toggleEditorMode = (mode) => {
    setEditorMode(mode)
  }

  const handleSend = async () => {
    if (!email || email.trim() === '' || !subject || !body) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Atenção',
        message: 'Por favor, preencha todos os campos (pelo menos um email é obrigatório)',
        buttonText: 'OK'
      })
      return
    }

    setIsSending(true)
    try {
      await onSend(siteId, {
        email,
        subject,
        body
      })
      onClose()
    } catch (error) {
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Erro',
        message: `Erro ao enviar relatório: ${error.message}`,
        buttonText: 'OK'
      })
    } finally {
      setIsSending(false)
    }
  }

  if (!siteId) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Enviar Relatório</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {(siteLoading || !siteCardData) ? (
            <div className="loading-state">
              <FontAwesomeIcon icon={faSpinner} spin /> Carregando dados e template profissional...
            </div>
          ) : siteData ? (
            <>
              <div className="report-client-info">
                <h3>Cliente</h3>
                <p><strong>Nome:</strong> {siteData.client?.name || 'N/A'}</p>
                <p>
                  <strong>E-mails:</strong> {
                    siteData.client?.email ? (
                      siteData.client.email.includes(',') ? (
                        <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                          {siteData.client.email.split(',').map((email, idx) => (
                            <span key={idx} style={{ 
                              display: 'inline-block', 
                              padding: '2px 6px', 
                              background: 'rgba(102, 126, 234, 0.2)', 
                              borderRadius: '4px', 
                              fontSize: '12px',
                              marginRight: '4px'
                            }}>
                              {email.trim()}
                            </span>
                          ))}
                        </span>
                      ) : (
                        siteData.client.email
                      )
                    ) : 'N/A'
                  }
                </p>
                <p><strong>Site:</strong> {siteData.domain}</p>
              </div>

              <div className="report-email-form">
                <div className="form-group">
                  <label>E-mails Destinatários</label>
                  <span style={{ display: 'block', fontSize: '12px', color: '#b0b0b0', marginBottom: '8px' }}>
                    Você pode adicionar múltiplos e-mails para enviar o relatório
                  </span>
                  <EmailChipsInput
                    value={email}
                    onChange={(value) => setEmail(value)}
                    placeholder="Digite um email e pressione Enter"
                    disabled={isSending}
                  />
                </div>

                <div className="form-group">
                  <label>Assunto do Email</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Assunto do relatório"
                    disabled={isSending}
                  />
                </div>

                <div className="form-group">
                  <label>Corpo do Email</label>
                  
                  {/* Tabs para alternar entre Visual e HTML */}
                  <div className="editor-tabs">
                    <button
                      type="button"
                      className={`editor-tab ${editorMode === 'html' ? 'active' : ''}`}
                      onClick={() => toggleEditorMode('html')}
                      disabled={isSending}
                    >
                      <FontAwesomeIcon icon={faCode} /> HTML
                    </button>
                    <button
                      type="button"
                      className={`editor-tab ${editorMode === 'visual' ? 'active' : ''}`}
                      onClick={() => toggleEditorMode('visual')}
                      disabled={isSending}
                    >
                      <FontAwesomeIcon icon={faEye} /> Visual
                    </button>
                  </div>

                  {/* Modo Visual - Editor WYSIWYG */}
                  {editorMode === 'visual' && (
                    <div className="editor-visual-container">
                      {/* Toolbar de Formatação */}
                      <div className="editor-toolbar">
                        {/* Formatação de Texto */}
                        <div className="toolbar-group">
                          <button
                            type="button"
                            className={`toolbar-btn ${toolbarState.bold ? 'active' : ''}`}
                            onClick={() => executeCommand('bold')}
                            title="Negrito (Ctrl+B)"
                            disabled={isSending}
                          >
                            <FontAwesomeIcon icon={faBold} />
                          </button>
                          <button
                            type="button"
                            className={`toolbar-btn ${toolbarState.italic ? 'active' : ''}`}
                            onClick={() => executeCommand('italic')}
                            title="Itálico (Ctrl+I)"
                            disabled={isSending}
                          >
                            <FontAwesomeIcon icon={faItalic} />
                          </button>
                          <button
                            type="button"
                            className={`toolbar-btn ${toolbarState.underline ? 'active' : ''}`}
                            onClick={() => executeCommand('underline')}
                            title="Sublinhado (Ctrl+U)"
                            disabled={isSending}
                          >
                            <FontAwesomeIcon icon={faUnderline} />
                          </button>
                          <button
                            type="button"
                            className={`toolbar-btn ${toolbarState.strikethrough ? 'active' : ''}`}
                            onClick={() => executeCommand('strikeThrough')}
                            title="Tachado"
                            disabled={isSending}
                          >
                            <FontAwesomeIcon icon={faStrikethrough} />
                          </button>
                        </div>

                        <div className="toolbar-separator" />

                        {/* Cores */}
                        <div className="toolbar-group">
                          <div className="toolbar-color-picker">
                            <FontAwesomeIcon icon={faPalette} />
                            <input
                              type="color"
                              value={toolbarState.fontColor}
                              onChange={handleFontColorChange}
                              title="Cor do texto"
                              disabled={isSending}
                            />
                          </div>
                          <div className="toolbar-color-picker">
                            <FontAwesomeIcon icon={faFill} />
                            <input
                              type="color"
                              value={toolbarState.backgroundColor}
                              onChange={handleBackgroundColorChange}
                              title="Cor de fundo"
                              disabled={isSending}
                            />
                          </div>
                        </div>

                        <div className="toolbar-separator" />

                        {/* Tamanho da Fonte */}
                        <div className="toolbar-group">
                          <select
                            className="toolbar-select"
                            value={toolbarState.fontSize}
                            onChange={handleFontSizeChange}
                            title="Tamanho da fonte"
                            disabled={isSending}
                          >
                            <option value="1">Pequeno</option>
                            <option value="2">Normal</option>
                            <option value="3">Médio</option>
                            <option value="4">Grande</option>
                            <option value="5">Muito Grande</option>
                            <option value="6">Extra Grande</option>
                            <option value="7">Máximo</option>
                          </select>
                        </div>

                        <div className="toolbar-separator" />

                        {/* Alinhamento */}
                        <div className="toolbar-group">
                          <button
                            type="button"
                            className="toolbar-btn"
                            onClick={() => executeCommand('justifyLeft')}
                            title="Alinhar à esquerda"
                            disabled={isSending}
                          >
                            <FontAwesomeIcon icon={faAlignLeft} />
                          </button>
                          <button
                            type="button"
                            className="toolbar-btn"
                            onClick={() => executeCommand('justifyCenter')}
                            title="Centralizar"
                            disabled={isSending}
                          >
                            <FontAwesomeIcon icon={faAlignCenter} />
                          </button>
                          <button
                            type="button"
                            className="toolbar-btn"
                            onClick={() => executeCommand('justifyRight')}
                            title="Alinhar à direita"
                            disabled={isSending}
                          >
                            <FontAwesomeIcon icon={faAlignRight} />
                          </button>
                          <button
                            type="button"
                            className="toolbar-btn"
                            onClick={() => executeCommand('justifyFull')}
                            title="Justificar"
                            disabled={isSending}
                          >
                            <FontAwesomeIcon icon={faAlignJustify} />
                          </button>
                        </div>

                        <div className="toolbar-separator" />

                        {/* Listas */}
                        <div className="toolbar-group">
                          <button
                            type="button"
                            className="toolbar-btn"
                            onClick={() => executeCommand('insertUnorderedList')}
                            title="Lista com marcadores"
                            disabled={isSending}
                          >
                            <FontAwesomeIcon icon={faListUl} />
                          </button>
                          <button
                            type="button"
                            className="toolbar-btn"
                            onClick={() => executeCommand('insertOrderedList')}
                            title="Lista numerada"
                            disabled={isSending}
                          >
                            <FontAwesomeIcon icon={faListOl} />
                          </button>
                        </div>

                        <div className="toolbar-separator" />

                        {/* Link */}
                        <div className="toolbar-group">
                          <button
                            type="button"
                            className="toolbar-btn"
                            onClick={handleInsertLink}
                            title="Inserir link"
                            disabled={isSending}
                          >
                            <FontAwesomeIcon icon={faLink} />
                          </button>
                        </div>
                      </div>

                      {/* Editor iframe */}
                      <iframe
                        ref={iframeRef}
                        className="editor-visual-iframe"
                        title="Editor Visual"
                        sandbox="allow-same-origin allow-scripts"
                        style={{
                          width: '100%',
                          minHeight: '500px',
                          border: 'none',
                          borderRadius: '0 0 4px 4px',
                          background: 'white'
                        }}
                      />
                    </div>
                  )}

                  {/* Modo HTML - Editor de Código */}
                  {editorMode === 'html' && (
                    <div className="editor-html-container">
                      <textarea
                        ref={htmlEditorRef}
                        value={body}
                        onChange={handleHtmlChange}
                        placeholder="Conteúdo do email em HTML"
                        disabled={isSending}
                        className="email-body-editor"
                        style={{
                          width: '100%',
                          minHeight: '500px',
                          fontFamily: 'Monaco, "Courier New", monospace',
                          fontSize: '14px',
                          lineHeight: '1.5',
                          padding: '15px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '4px',
                          background: 'rgba(0, 0, 0, 0.3)',
                          color: '#e0e0e0',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="error-state">
              Erro ao carregar dados do site
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
            disabled={isSending}
          >
            Cancelar
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSend}
            disabled={isSending || !email || email.trim() === '' || !subject || !body}
          >
            {isSending ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin /> Enviando...
              </>
            ) : (
              'Enviar Relatório'
            )}
          </button>
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

export default ReportModal

