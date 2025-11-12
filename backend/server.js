/**
 * ArtnaWEB Monitor - Backend Server
 * Node.js + Express + MySQL
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

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

// Configurar CORS
// SEMPRE permitir origens de produção (independente de NODE_ENV)
// Isso resolve problemas quando NODE_ENV não está configurado no servidor
const productionOrigins = [
      'https://gestao.artnaweb.com.br',
      'https://www.gestao.artnaweb.com.br',
      'https://api.gestao.artnaweb.com.br'
];

// Origens permitidas em desenvolvimento
const developmentOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];

// SEMPRE permitir ambas as origens (produção + desenvolvimento)
// Isso garante que funcione mesmo se NODE_ENV não estiver configurado
const allowedOrigins = [...productionOrigins, ...developmentOrigins];

// Log da configuração ao iniciar
console.log(`[CORS Config] NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
console.log(`[CORS Config] Origens permitidas: ${allowedOrigins.join(', ')}`);

// Função para verificar se a origin é permitida
const isOriginAllowed = (origin) => {
  if (!origin) return true; // Permitir requisições sem origin (ex: Postman, mobile)
  const isAllowed = allowedOrigins.includes(origin);
  if (!isAllowed) {
    console.log(`[CORS] Origin rejeitada: "${origin}"`);
    console.log(`[CORS] Origens permitidas: ${allowedOrigins.join(', ')}`);
  }
  return isAllowed;
};

// Handler explícito para requisições OPTIONS (preflight) - DEVE vir ANTES do middleware cors
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  
  console.log(`[CORS OPTIONS] Requisição OPTIONS recebida de: ${origin}`);
  
  if (isOriginAllowed(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24 horas
    console.log(`[CORS OPTIONS] Preflight permitido para: ${origin}`);
    return res.sendStatus(200);
  } else {
    console.log(`[CORS OPTIONS] Origem NÃO permitida: ${origin}`);
    console.log(`[CORS OPTIONS] Origens permitidas: ${allowedOrigins.join(', ')}`);
    return res.status(403).json({ error: 'CORS not allowed' });
  }
});

// Configurar CORS com middleware
app.use(cors({
  origin: function (origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.log(`[CORS] Origem bloqueada: ${origin}`);
      console.log(`[CORS] Origens permitidas: ${allowedOrigins.join(', ')}`);
      console.log(`[CORS] NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200 // Para navegadores legados
}));

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

// Rota para download do plugin WordPress
app.get('/api/plugin/download', (req, res) => {
  try {
    const fs = require('fs');
    
    // Tentar primeiro na pasta plugins/ (organizado)
    let pluginPath = path.join(__dirname, '..', 'plugins', 'artnaweb-monitor-plugin.zip');
    
    // Se não existir, tentar na raiz (compatibilidade)
    if (!fs.existsSync(pluginPath)) {
      pluginPath = path.join(__dirname, '..', 'Plugin Artnaweb Monitor.zip');
    }
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(pluginPath)) {
      console.error('Plugin não encontrado em:', pluginPath);
      return res.status(404).json({
        success: false,
        message: 'Arquivo do plugin não encontrado'
      });
    }
    
    res.download(pluginPath, 'artnaweb-monitor-plugin.zip', (err) => {
      if (err) {
        console.error('Erro ao fazer download do plugin:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Erro ao fazer download do plugin'
          });
        }
      }
    });
  } catch (error) {
    console.error('Erro ao servir plugin:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao fazer download do plugin'
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('='.repeat(50));
  console.error('❌ ERRO NO SERVIDOR:');
  console.error('Path:', req.path);
  console.error('Method:', req.method);
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  console.error('='.repeat(50));
  
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(isDevelopment && {
      stack: err.stack,
      details: err.toString()
    })
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

