import React, { useState, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faEye, 
  faCode, 
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
import './ReportModal.css'

const EmailTemplateEditor = ({ value, onChange, placeholder = 'Digite o template HTML do email...' }) => {
  const [editorMode, setEditorMode] = useState('visual') // 'visual' ou 'html'
  const iframeRef = useRef(null)
  const htmlEditorRef = useRef(null)
  const isUpdatingIframeRef = useRef(false) // Flag para evitar loops de atualização
  const [toolbarState, setToolbarState] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    fontSize: '16px',
    fontColor: '#000000',
    backgroundColor: '#ffffff'
  })

  // Função para substituir variáveis por dados de exemplo (para exibição visual)
  const replaceVariablesWithExamples = (html) => {
    if (!html) return html
    
    // Obter data atual formatada
    const currentDate = new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    // Dados de exemplo para as variáveis (usando template do backend como referência)
    const exampleData = {
      clientName: 'João Silva',
      clientEmail: 'joao@exemplo.com.br',
      clientPhone: '(11) 99999-9999',
      reportDate: currentDate,
      totalSites: '3',
      sitesList: `
        <div class="site-section" style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          <div class="site-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #f0f0f0;">
            <h2 style="font-size: 22px; color: #333; margin: 0;">exemplo.com.br</h2>
            <span class="status-badge status-clean" style="display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; text-transform: uppercase; background: #d1fae5; color: #065f46;">Seguro</span>
          </div>
          <div class="monitoring-active" style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #059669;">
            <div class="text" style="color: #065f46; font-weight: 600;">Monitoramento ativo - Site seguro e funcionando normalmente</div>
          </div>
          <div class="metrics-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0;">
            <div class="metric-card" style="background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); padding: 20px; border-radius: 10px; text-align: center; border: 1px solid #e0e0e0; box-shadow: 0 2px 6px rgba(0,0,0,0.04);">
              <div class="metric-label" style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; font-weight: 600;">Disponibilidade</div>
              <div class="metric-value good" style="font-size: 24px; font-weight: 700; color: #059669; line-height: 1.3;">99.95%</div>
            </div>
            <div class="metric-card" style="background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); padding: 20px; border-radius: 10px; text-align: center; border: 1px solid #e0e0e0; box-shadow: 0 2px 6px rgba(0,0,0,0.04);">
              <div class="metric-label" style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; font-weight: 600;">Tempo de Resposta</div>
              <div class="metric-value good" style="font-size: 24px; font-weight: 700; color: #059669; line-height: 1.3;">245ms</div>
            </div>
            <div class="metric-card" style="background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); padding: 20px; border-radius: 10px; text-align: center; border: 1px solid #e0e0e0; box-shadow: 0 2px 6px rgba(0,0,0,0.04);">
              <div class="metric-label" style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; font-weight: 600;">Segurança</div>
              <div class="metric-value good" style="font-size: 24px; font-weight: 700; color: #059669; line-height: 1.3;">A</div>
            </div>
          </div>
          <div class="section-title" style="font-size: 18px; font-weight: 600; color: #333; margin: 25px 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #f0f0f0;">Status de Segurança</div>
          <div class="info-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin: 15px 0;">
            <div class="info-item" style="padding: 15px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid #667eea;">
              <div class="info-label" style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Malware</div>
              <div class="info-value" style="font-size: 16px; font-weight: 600; color: #059669;">Protegido</div>
              <div class="info-description" style="font-size: 13px; color: #666; margin-top: 5px;">Nenhum malware detectado</div>
            </div>
            <div class="info-item" style="padding: 15px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid #667eea;">
              <div class="info-label" style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Blacklist</div>
              <div class="info-value" style="font-size: 16px; font-weight: 600; color: #059669;">Verificado</div>
              <div class="info-description" style="font-size: 13px; color: #666; margin-top: 5px;">Não listado em blacklists</div>
            </div>
            <div class="info-item" style="padding: 15px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid #667eea;">
              <div class="info-label" style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Certificado SSL</div>
              <div class="info-value" style="font-size: 16px; font-weight: 600; color: #059669;">Ativo</div>
              <div class="info-description" style="font-size: 13px; color: #666; margin-top: 5px;">Certificado SSL válido</div>
            </div>
            <div class="info-item" style="padding: 15px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid #667eea;">
              <div class="info-label" style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Headers de Segurança</div>
              <div class="info-value" style="font-size: 16px; font-weight: 600; color: #059669;">5/5 Configurados</div>
              <div class="info-description" style="font-size: 13px; color: #666; margin-top: 5px;">Proteção de segurança ativa</div>
            </div>
          </div>
        </div>
      `.trim()
    }
    
    // Substituir todas as variáveis no formato {{variableName}}
    // Usar uma abordagem mais robusta que preserva a estrutura HTML
    let renderedHtml = html
    
    // Criar um mapeamento de variáveis para valores, processando em ordem de complexidade
    // (variáveis simples primeiro, depois variáveis complexas como sitesList)
    const variableOrder = ['clientName', 'clientEmail', 'clientPhone', 'reportDate', 'totalSites', 'sitesList']
    
    variableOrder.forEach(key => {
      if (exampleData[key]) {
        // Escapar caracteres especiais para regex
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`\\{\\{${escapedKey}\\}\\}`, 'g')
        renderedHtml = renderedHtml.replace(regex, exampleData[key])
      }
    })
    
    return renderedHtml
  }

  // Função para restaurar variáveis a partir do conteúdo editado
  // Esta função tenta identificar dados de exemplo e substituí-los de volta pelas variáveis
  const restoreVariablesFromExamples = (editedHtml, originalHtml) => {
    if (!editedHtml) return editedHtml
    
    let restoredHtml = editedHtml
    
    // Estratégia: comparar com o HTML original para identificar o que foi editado
    // Se o conteúdo não mudou em relação ao exemplo, restaurar a variável
    // Se mudou, manter o conteúdo editado
    
    // Extrair body de ambos os HTMLs para comparação
    const editedBodyMatch = editedHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i)
    const editedBody = editedBodyMatch ? editedBodyMatch[1] : editedHtml
    
    // Se temos o HTML original, usar para referência
    if (originalHtml) {
      const originalBodyMatch = originalHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i)
      const originalBody = originalBodyMatch ? originalBodyMatch[1] : originalHtml
      
      // Se o body editado é muito diferente do original, pode ser que as variáveis foram substituídas
      // Nesse caso, tentar restaurar baseado em padrões conhecidos
    }
    
    // Restaurar variáveis simples baseado em padrões conhecidos dos dados de exemplo
    // clientName
    if (editedBody.includes('João Silva') && (!originalHtml || originalHtml.includes('{{clientName}}'))) {
      // Só substituir se ainda está no formato do exemplo
      restoredHtml = restoredHtml.replace(/João Silva/g, '{{clientName}}')
    }
    
    // clientEmail
    if (editedBody.includes('joao@exemplo.com.br') && (!originalHtml || originalHtml.includes('{{clientEmail}}'))) {
      restoredHtml = restoredHtml.replace(/joao@exemplo\.com\.br/g, '{{clientEmail}}')
    }
    
    // clientPhone
    if (editedBody.includes('(11) 99999-9999') && (!originalHtml || originalHtml.includes('{{clientPhone}}'))) {
      restoredHtml = restoredHtml.replace(/\(11\) 99999-9999/g, '{{clientPhone}}')
    }
    
    // totalSites - mais difícil, pois "3" pode aparecer em outros contextos
    // Vamos ser mais cuidadosos aqui
    if (editedBody.match(/\b3\s*site/i) && (!originalHtml || originalHtml.includes('{{totalSites}}'))) {
      restoredHtml = restoredHtml.replace(/\b3\s*site/gi, '{{totalSites}} site')
    }
    
    // reportDate - padrão de data brasileira
    // Formato: DD/MM/YYYY, HH:MM ou DD/MM/YYYY HH:MM
    const datePattern = /\d{2}\/\d{2}\/\d{4}[,\s]+\d{2}:\d{2}/
    if (datePattern.test(editedBody) && (!originalHtml || originalHtml.includes('{{reportDate}}'))) {
      // Tentar restaurar datas que correspondem ao formato de exemplo
      restoredHtml = restoredHtml.replace(datePattern, '{{reportDate}}')
    }
    
    // sitesList - muito complexo para restaurar automaticamente
    // Se o usuário editou o HTML do sitesList, manteremos a edição
    // Apenas se o HTML do sitesList ainda contém o exemplo completo, podemos considerar restaurar
    // Mas isso é muito arriscado, então vamos deixar como está
    
    return restoredHtml
  }

  // Atualizar iframe quando value mudar OU quando mudar para modo visual
  useEffect(() => {
    if (editorMode === 'visual' && iframeRef.current) {
      if (!value) return
      
      // Se estamos atualizando programaticamente, pular
      if (isUpdatingIframeRef.current) {
        isUpdatingIframeRef.current = false
        return
      }
      
      try {
        const iframe = iframeRef.current
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
        
        // Substituir variáveis por dados de exemplo para exibição visual
        const renderedHtml = replaceVariablesWithExamples(value)
        
        // Obter o HTML atual do iframe para comparar (apenas body content)
        const currentBodyContent = iframeDoc.body?.innerHTML || ''
        const newBodyMatch = renderedHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i)
        const newBodyContent = newBodyMatch ? newBodyMatch[1] : renderedHtml
        
        // Só atualizar se o conteúdo mudou significativamente
        if (currentBodyContent.trim() !== newBodyContent.trim()) {
          iframeDoc.open()
          iframeDoc.write(renderedHtml)
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
                    
                    // Tentar restaurar as variáveis do conteúdo editado
                    // Primeiro, reconstruir o HTML com o body editado
                    const headMatch = value.match(/<head[^>]*>([\s\S]*)<\/head>/i)
                    const headContent = headMatch ? headMatch[0] : '<head><meta charset="UTF-8"></head>'
                    
                    // Reconstruir o HTML com o conteúdo editado
                    let editedHtml = `<!DOCTYPE html>
<html>
${headContent}
<body>
${bodyContent}
</body>
</html>`
                    
                    // Tentar restaurar variáveis (substituir dados de exemplo de volta para variáveis)
                    editedHtml = restoreVariablesFromExamples(editedHtml)
                    
                    onChange(editedHtml)
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
  }, [value, editorMode, onChange])

  // Handler para mudança no editor HTML
  const handleHtmlChange = (e) => {
    onChange(e.target.value)
  }

  // Alternar entre modos
  const toggleEditorMode = (mode) => {
    setEditorMode(mode)
  }

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

  // Converter RGB para Hex
  const rgbToHex = (rgb) => {
    const result = rgb.match(/\d+/g)
    if (!result || result.length < 3) return '#000000'
    return '#' + result.map(x => {
      const hex = parseInt(x).toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }).join('')
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

  return (
    <div className="email-template-editor-wrapper">
      {/* Tabs para alternar entre Visual e HTML */}
      <div className="editor-tabs">
        <button
          type="button"
          className={`editor-tab ${editorMode === 'html' ? 'active' : ''}`}
          onClick={() => toggleEditorMode('html')}
        >
          <FontAwesomeIcon icon={faCode} /> HTML
        </button>
        <button
          type="button"
          className={`editor-tab ${editorMode === 'visual' ? 'active' : ''}`}
          onClick={() => toggleEditorMode('visual')}
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
              >
                <FontAwesomeIcon icon={faBold} />
              </button>
              <button
                type="button"
                className={`toolbar-btn ${toolbarState.italic ? 'active' : ''}`}
                onClick={() => executeCommand('italic')}
                title="Itálico (Ctrl+I)"
              >
                <FontAwesomeIcon icon={faItalic} />
              </button>
              <button
                type="button"
                className={`toolbar-btn ${toolbarState.underline ? 'active' : ''}`}
                onClick={() => executeCommand('underline')}
                title="Sublinhado (Ctrl+U)"
              >
                <FontAwesomeIcon icon={faUnderline} />
              </button>
              <button
                type="button"
                className={`toolbar-btn ${toolbarState.strikethrough ? 'active' : ''}`}
                onClick={() => executeCommand('strikeThrough')}
                title="Tachado"
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
                />
              </div>
              <div className="toolbar-color-picker">
                <FontAwesomeIcon icon={faFill} />
                <input
                  type="color"
                  value={toolbarState.backgroundColor}
                  onChange={handleBackgroundColorChange}
                  title="Cor de fundo"
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
              >
                <FontAwesomeIcon icon={faAlignLeft} />
              </button>
              <button
                type="button"
                className="toolbar-btn"
                onClick={() => executeCommand('justifyCenter')}
                title="Centralizar"
              >
                <FontAwesomeIcon icon={faAlignCenter} />
              </button>
              <button
                type="button"
                className="toolbar-btn"
                onClick={() => executeCommand('justifyRight')}
                title="Alinhar à direita"
              >
                <FontAwesomeIcon icon={faAlignRight} />
              </button>
              <button
                type="button"
                className="toolbar-btn"
                onClick={() => executeCommand('justifyFull')}
                title="Justificar"
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
              >
                <FontAwesomeIcon icon={faListUl} />
              </button>
              <button
                type="button"
                className="toolbar-btn"
                onClick={() => executeCommand('insertOrderedList')}
                title="Lista numerada"
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
            value={value || ''}
            onChange={handleHtmlChange}
            placeholder={placeholder}
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
  )
}

export default EmailTemplateEditor

