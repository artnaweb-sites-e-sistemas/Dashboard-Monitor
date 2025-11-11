/**
 * Authentication Routes
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('Tentativa de login:', { username, passwordReceived: !!password });

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Usuário e senha são obrigatórios'
      });
    }

    // Buscar usuário
    const [users] = await db.execute(
      'SELECT id, username, password FROM users WHERE username = ?',
      [username]
    );

    console.log('Usuários encontrados:', users.length);

    if (users.length === 0) {
      console.log('Usuário não encontrado:', username);
      return res.status(401).json({
        success: false,
        message: 'Usuário ou senha incorretos'
      });
    }

    const user = users[0];
    console.log('Usuário encontrado:', user.username);

    // Verificar senha
    const validPassword = await bcrypt.compare(password, user.password);
    console.log('Senha válida:', validPassword);

    if (!validPassword) {
      console.log('Senha inválida para usuário:', username);
      return res.status(401).json({
        success: false,
        message: 'Usuário ou senha incorretos'
      });
    }

    // Verificar JWT_SECRET
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET não configurado!');
      return res.status(500).json({
        success: false,
        message: 'Erro de configuração do servidor'
      });
    }

    // Gerar token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    console.log('Login bem-sucedido para:', username);

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar login: ' + error.message
    });
  }
});

// Verificar token
router.get('/verify', require('../middleware/auth').authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

module.exports = router;

