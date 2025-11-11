import React, { useState, useRef, useEffect } from 'react'
import './EmailChipsInput.css'

const EmailChipsInput = ({ value = '', onChange, placeholder = 'Digite um email e pressione Enter', disabled = false }) => {
  const [emails, setEmails] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  // Inicializar emails do value (string separada por vírgula ou array)
  useEffect(() => {
    if (value) {
      if (typeof value === 'string') {
        const emailList = value.split(',').map(e => e.trim().toLowerCase()).filter(e => e)
        setEmails(emailList)
      } else if (Array.isArray(value)) {
        setEmails(value.map(e => typeof e === 'string' ? e.trim().toLowerCase() : e).filter(e => e))
      }
    } else {
      setEmails([])
    }
  }, [value])

  // Validar email
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Adicionar email
  const addEmail = (email) => {
    const trimmedEmail = email.trim().toLowerCase()
    
    if (!trimmedEmail) {
      return
    }

    // Validar formato
    if (!isValidEmail(trimmedEmail)) {
      setError('Email inválido')
      setTimeout(() => setError(''), 3000)
      return
    }

    // Verificar se já existe (case-insensitive)
    if (emails.map(e => e.toLowerCase()).includes(trimmedEmail)) {
      setError('Este email já foi adicionado')
      setTimeout(() => setError(''), 3000)
      return
    }

    // Adicionar email
    const newEmails = [...emails, trimmedEmail]
    setEmails(newEmails)
    setInputValue('')
    setError('')
    
    // Notificar mudança (enviar como string separada por vírgula)
    onChange(newEmails.join(','))
    
    // Focar no input novamente
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  // Remover email
  const removeEmail = (emailToRemove) => {
    const newEmails = emails.filter(email => email !== emailToRemove)
    setEmails(newEmails)
    setError('')
    
    // Notificar mudança
    onChange(newEmails.join(','))
  }

  // Lidar com teclas
  const handleKeyDown = (e) => {
    if (disabled) return

    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (inputValue.trim()) {
        addEmail(inputValue)
      }
    } else if (e.key === 'Backspace' && !inputValue && emails.length > 0) {
      // Remover último email se backspace for pressionado com input vazio
      removeEmail(emails[emails.length - 1])
    }
  }

  // Lidar com mudança no input
  const handleInputChange = (e) => {
    setInputValue(e.target.value)
    setError('')
  }

  // Lidar com blur (quando perde o foco)
  const handleBlur = () => {
    // Adicionar email se houver valor quando perder o foco
    if (inputValue.trim()) {
      addEmail(inputValue)
    }
  }

  // Lidar com paste
  const handlePaste = (e) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text')
    const emailsToAdd = pastedText.split(/[,\n;]/).map(e => e.trim()).filter(e => e)
    const existingEmailsLower = emails.map(e => e.toLowerCase())
    
    const validEmailsToAdd = emailsToAdd.filter(email => {
      const emailLower = email.toLowerCase()
      return isValidEmail(email) && !existingEmailsLower.includes(emailLower)
    })
    
    if (validEmailsToAdd.length > 0) {
      const newEmails = [...emails, ...validEmailsToAdd.map(e => e.toLowerCase())]
      setEmails(newEmails)
      setInputValue('')
      setError('')
      onChange(newEmails.join(','))
    } else if (emailsToAdd.length > 0) {
      setError('Nenhum email válido foi adicionado ou todos os emails já estão na lista')
      setTimeout(() => setError(''), 3000)
    }
  }

  return (
    <div className="email-chips-input-container" ref={containerRef}>
      <div 
        className={`email-chips-input ${error ? 'has-error' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Tags de emails */}
        {emails.map((email, index) => (
          <div key={index} className="email-chip">
            <span className="email-chip-text">{email}</span>
            {!disabled && (
              <button
                type="button"
                className="email-chip-remove"
                onClick={(e) => {
                  e.stopPropagation()
                  removeEmail(email)
                }}
                aria-label={`Remover ${email}`}
              >
                ×
              </button>
            )}
          </div>
        ))}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onPaste={handlePaste}
          placeholder={emails.length === 0 ? placeholder : 'Adicione outro email...'}
          disabled={disabled}
          className="email-chips-input-field"
        />
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="email-chips-error">{error}</div>
      )}

      {/* Dica */}
      <div className="email-chips-hint">
        Pressione Enter ou vírgula para adicionar. Você pode colar múltiplos emails separados por vírgula.
      </div>
    </div>
  )
}

export default EmailChipsInput

