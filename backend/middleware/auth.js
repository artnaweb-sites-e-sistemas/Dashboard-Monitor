/**
 * Authentication Middleware
 */

const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('[Auth Middleware] Verificando autenticação...');
    console.log('[Auth Middleware] Path:', req.path);
    console.log('[Auth Middleware] Token presente:', !!token);

    if (!token) {
      console.log('[Auth Middleware] ❌ Token não fornecido');
      return res.status(401).json({
        success: false,
        message: 'Token de acesso não fornecido'
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('[Auth Middleware] ❌ JWT_SECRET não configurado!');
      return res.status(500).json({
        success: false,
        message: 'Erro de configuração do servidor'
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        console.log('[Auth Middleware] ❌ Token inválido:', err.message);
        return res.status(403).json({
          success: false,
          message: 'Token inválido ou expirado'
        });
      }

      console.log('[Auth Middleware] ✅ Token válido para usuário:', user.username);
      req.user = user;
      next();
    });
  } catch (error) {
    console.error('[Auth Middleware] ❌ Erro no middleware:', error);
    console.error('[Auth Middleware] Stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Erro ao processar autenticação'
    });
  }
};

module.exports = { authenticateToken };

