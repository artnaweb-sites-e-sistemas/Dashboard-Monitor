import axios from 'axios'

// Determinar a URL base da API
// Em desenvolvimento: usa /api (proxy do Vite)
// Em produção: usa a variável de ambiente ou fallback para /api
const getBaseURL = () => {
  // Verificar se estamos em produção
  const isProd = import.meta.env.PROD || window.location.hostname !== 'localhost'
  const apiUrl = import.meta.env.VITE_API_URL
  
  // Debug (remover em produção final)
  if (isProd) {
    console.log('[API Config] Modo produção detectado')
    console.log('[API Config] VITE_API_URL:', apiUrl)
    console.log('[API Config] import.meta.env.PROD:', import.meta.env.PROD)
  }
  
  // Se estiver em produção e tiver variável de ambiente configurada
  if (isProd && apiUrl) {
    return apiUrl
  }
  // Em desenvolvimento ou se não houver variável, usa /api (proxy)
  return '/api'
}

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 60000 // 60 segundos (scan pode demorar)
})

// Interceptor para adicionar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para tratar erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    } else if (error.response?.status === 429) {
      // Erro de rate limiting - mostrar mensagem mais clara
      const message = error.response?.data?.message || 'Muitas requisições. Aguarde alguns minutos e tente novamente.'
      error.rateLimitMessage = message
    }
    return Promise.reject(error)
  }
)

export default api

