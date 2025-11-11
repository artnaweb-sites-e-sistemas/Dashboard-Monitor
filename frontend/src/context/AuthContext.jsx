import React, { createContext, useState, useContext, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar token ao carregar
    const token = localStorage.getItem('token')
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      verifyToken()
    } else {
      setLoading(false)
    }
  }, [])

  const verifyToken = async () => {
    try {
      const response = await api.get('/auth/verify')
      if (response.data.success) {
        setIsAuthenticated(true)
        setUser(response.data.user)
      } else {
        logout()
      }
    } catch (error) {
      logout()
    } finally {
      setLoading(false)
    }
  }

  const login = async (username, password) => {
    try {
      console.log('Tentando login...', { username });
      const response = await api.post('/auth/login', { username, password })
      console.log('Resposta do login:', response.data);
      if (response.data.success) {
        const { token, user } = response.data
        localStorage.setItem('token', token)
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        setIsAuthenticated(true)
        setUser(user)
        return { success: true }
      }
      return { success: false, message: response.data.message }
    } catch (error) {
      console.error('Erro no login:', error);
      console.error('Response:', error.response?.data);
      console.error('Status:', error.response?.status);
      
      // Tratar erro de rate limiting (429)
      if (error.response?.status === 429) {
        const message = error.response?.data?.message || error.rateLimitMessage || 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.'
        return { 
          success: false, 
          message: message,
          isRateLimit: true
        }
      }
      
      return { 
        success: false, 
        message: error.response?.data?.message || error.message || 'Erro ao fazer login. Verifique se o backend está rodando.' 
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
    setIsAuthenticated(false)
    setUser(null)
  }

  if (loading) {
    return <div>Carregando...</div>
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

