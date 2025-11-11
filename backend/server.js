/**
 * ArtnaWEB Monitor - Backend Server
 * Node.js + Express + MySQL
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const sitesRoutes = require('./routes/sites');
const scanRoutes = require('./routes/scan');
const settingsRoutes = require('./routes/settings');
const clientsRoutes = require('./routes/clients');
const reportsRoutes = require('./routes/reports');
const uptimerobotRoutes = require('./routes/uptimerobot');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy para obter IP real (necessário para rate limiting funcionar corretamente)
app.set('trust proxy', 1);

// Middleware
// Configurar CORS baseado no ambiente
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://gestao.artnaweb.com.br',
      'https://www.gestao.artnaweb.com.br',
      'https://api.gestao.artnaweb.com.br'
    ]
  : [
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requisições sem origin (ex: Postman, mobile apps)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`[CORS] Origem bloqueada: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handler explícito para requisições OPTIONS (preflight)
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    const bodyCopy = { ...req.body };
    if (bodyCopy.password) bodyCopy.password = '***';
    console.log('Body:', JSON.stringify(bodyCopy));
  }
  next();
});

// Rate limiting - Desabilitado para desenvolvimento local
// Em produção, você pode reativar com limites mais altos
const isDevelopment = process.env.NODE_ENV !== 'production';

// Rate limiter geral (desabilitado em desenvolvimento, muito permissivo em produção)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 10000 : 1000, // Muito alto em desenvolvimento
  message: {
    success: false,
    message: 'Muitas requisições deste IP, tente novamente mais tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Em desenvolvimento local, pular rate limiting completamente para IPs locais
    if (isDevelopment) {
      const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '';
      const forwarded = req.headers['x-forwarded-for'];
      const isLocalIP = ip === '::1' || 
                        ip === '127.0.0.1' || 
                        ip.includes('127.0.0.1') || 
                        ip.includes('::ffff:127.0.0.1') ||
                        ip.startsWith('::ffff:127.') ||
                        (forwarded && forwarded.includes('127.0.0.1'));
      
      if (isLocalIP) {
        console.log(`[Rate Limit] Pulando rate limiting para IP local: ${ip}`);
        return true;
      }
    }
    return false;
  }
});

// Rate limiter específico para login (mais permissivo em desenvolvimento)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 100 : 20, // Mais permissivo em desenvolvimento
  message: {
    success: false,
    message: 'Muitas tentativas de login. Aguarde 15 minutos e tente novamente.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Em desenvolvimento local, pular rate limiting completamente para IPs locais
    if (isDevelopment) {
      const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '';
      const forwarded = req.headers['x-forwarded-for'];
      const isLocalIP = ip === '::1' || 
                        ip === '127.0.0.1' || 
                        ip.includes('127.0.0.1') || 
                        ip.includes('::ffff:127.0.0.1') ||
                        ip.startsWith('::ffff:127.') ||
                        (forwarded && forwarded.includes('127.0.0.1'));
      
      if (isLocalIP) {
        console.log(`[Rate Limit] Pulando rate limiting de login para IP local: ${ip}`);
        return true;
      }
    }
    return false;
  }
});

// Aplicar rate limiting geral em todas as rotas da API (mas será pulado em desenvolvimento local)
app.use('/api/', generalLimiter);

// Routes
// Aplicar rate limiter específico para login (mas será pulado em desenvolvimento local)
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/sites', sitesRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/uptimerobot', uptimerobotRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  console.log('');
  
  // Aguardar um pouco para garantir que o banco está conectado
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Iniciar serviço de scan automático
  try {
    console.log('Iniciando serviço de scan automático...');
    const autoScanService = require('./services/autoScanService');
    await autoScanService.startAutoScan();
    console.log('');
  } catch (error) {
    console.error('Erro ao iniciar scan automático:', error);
    console.error('Stack:', error.stack);
    console.log('');
  }

  // Iniciar serviço de sincronização de uptime
  try {
    console.log('Iniciando serviço de sincronização de uptime...');
    const uptimeSyncService = require('./services/uptimeSyncService');
    await uptimeSyncService.startUptimeSync();
    console.log('');
  } catch (error) {
    console.error('Erro ao iniciar sincronização de uptime:', error);
    console.error('Stack:', error.stack);
    console.log('');
  }
});

module.exports = app;

