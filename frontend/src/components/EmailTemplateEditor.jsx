import React, { useState, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faCode } from '@fortawesome/free-solid-svg-icons'
import './ReportModal.css'

const EmailTemplateEditor = ({ value, onChange, placeholder = 'Digite o template HTML do email...' }) => {
  const [editorMode, setEditorMode] = useState('visual') // 'visual' ou 'html'
  const iframeRef = useRef(null)
  const htmlEditorRef = useRef(null)
  const isUpdatingIframeRef = useRef(false) // Flag para evitar loops de atualização

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
        
        // Obter o HTML atual do iframe para comparar (apenas body content)
        const currentBodyContent = iframeDoc.body?.innerHTML || ''
        const newBodyMatch = value.match(/<body[^>]*>([\s\S]*)<\/body>/i)
        const newBodyContent = newBodyMatch ? newBodyMatch[1] : value
        
        // Só atualizar se o conteúdo mudou significativamente
        if (currentBodyContent.trim() !== newBodyContent.trim()) {
          iframeDoc.open()
          iframeDoc.write(value)
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
                    const headMatch = value.match(/<head[^>]*>([\s\S]*)<\/head>/i)
                    const headContent = headMatch ? headMatch[0] : '<head><meta charset="UTF-8"></head>'
                    
                    // Reconstruir o HTML
                    const newHtml = `<!DOCTYPE html>
<html>
${headContent}
<body>
${bodyContent}
</body>
</html>`
                    
                    onChange(newHtml)
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
          <iframe
            ref={iframeRef}
            className="editor-visual-iframe"
            title="Editor Visual"
            sandbox="allow-same-origin allow-scripts"
            style={{
              width: '100%',
              minHeight: '500px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
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

