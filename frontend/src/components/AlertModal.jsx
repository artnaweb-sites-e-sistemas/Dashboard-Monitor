import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheckCircle, faTimesCircle, faInfoCircle, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
import './AlertModal.css'

const AlertModal = ({ 
  isOpen, 
  onClose, 
  title = 'Aviso', 
  message = '',
  type = 'info', // 'success', 'error', 'warning', 'info'
  buttonText = 'OK'
}) => {
  if (!isOpen) return null

  const getIcon = () => {
    switch (type) {
      case 'success':
        return faCheckCircle
      case 'error':
        return faTimesCircle
      case 'warning':
        return faExclamationTriangle
      default:
        return faInfoCircle
    }
  }

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return '#34d399'
      case 'error':
        return '#f87171'
      case 'warning':
        return '#fbbf24'
      default:
        return '#60a5fa'
    }
  }

  const handleClose = () => {
    if (onClose) {
      onClose()
    }
  }

  // Processar quebras de linha no message
  const formatMessage = (msg) => {
    if (!msg) return ''
    return msg.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < msg.split('\n').length - 1 && <br />}
      </React.Fragment>
    ))
  }

  return (
    <div className="alert-modal-overlay" onClick={handleClose}>
      <div className="alert-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="alert-modal-header">
          <div className="alert-modal-icon" style={{ color: getIconColor() }}>
            <FontAwesomeIcon icon={getIcon()} />
          </div>
          <h2 className="alert-modal-title">{title}</h2>
          <button className="alert-modal-close" onClick={handleClose}>×</button>
        </div>
        
        <div className="alert-modal-body">
          <p className="alert-modal-message">{formatMessage(message)}</p>
        </div>
        
        <div className="alert-modal-footer">
          <button 
            className={`btn btn-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'primary'}`}
            onClick={handleClose}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AlertModal

