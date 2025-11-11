import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Login.css'

const Login = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await login(username, password)

      if (result.success) {
        navigate('/')
      } else {
        // Verificar se é erro de rate limiting (429)
        if (result.message && result.message.includes('429')) {
          setError('Muitas tentativas de login. Aguarde alguns minutos e tente novamente.')
        } else {
          setError(result.message || 'Usuário ou senha incorretos')
        }
      }
    } catch (error) {
      // Tratar erro de rate limiting
      if (error.response?.status === 429 || error.rateLimitMessage) {
        setError(error.rateLimitMessage || 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.')
      } else {
        setError(error.response?.data?.message || error.message || 'Erro ao fazer login. Verifique se o backend está rodando.')
      }
    }

    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <h1>ArtnaWEB Monitor</h1>
          <p className="subtitle">Sistema de Monitoramento de Sites</p>
          
          {error && <div className="alert alert-danger">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Usuário</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Senha</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
          
          <div className="login-footer">
            <small>Usuário padrão: admin / Senha: admin123</small>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login

