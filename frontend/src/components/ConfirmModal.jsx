import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExclamationTriangle, faCheckCircle, faInfoCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons'
import './ConfirmModal.css'

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirmar ação', 
  message = 'Tem certeza que deseja continuar?',
  type = 'warning', // 'warning', 'danger', 'info', 'success'
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isLoading = false
}) => {
  if (!isOpen) return null

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return faTimesCircle
      case 'success':
        return faCheckCircle
      case 'info':
        return faInfoCircle
      default:
        return faExclamationTriangle
    }
  }

  const getIconColor = () => {
    switch (type) {
      case 'danger':
        return '#f87171'
      case 'success':
        return '#34d399'
      case 'info':
        return '#60a5fa'
      default:
        return '#fbbf24'
    }
  }

  const handleConfirm = () => {
    onConfirm()
  }

  const handleCancel = () => {
    onClose()
  }

  return (
    <div className="confirm-modal-overlay" onClick={onClose}>
      <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-header">
          <div className="confirm-modal-icon" style={{ color: getIconColor() }}>
            <FontAwesomeIcon icon={getIcon()} />
          </div>
          <h2 className="confirm-modal-title">{title}</h2>
          <button className="confirm-modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="confirm-modal-body">
          <p className="confirm-modal-message">{message}</p>
        </div>
        
        <div className="confirm-modal-footer">
          <button 
            className="btn btn-secondary" 
            onClick={handleCancel}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button 
            className={`btn btn-${type === 'danger' ? 'danger' : 'primary'}`}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              'Processando...'
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal

