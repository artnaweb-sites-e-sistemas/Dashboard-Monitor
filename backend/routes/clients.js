/**
 * Clients Routes
 */

const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Todas as rotas precisam de autenticação
router.use(authenticateToken);

// Listar todos os clientes
router.get('/', async (req, res) => {
  try {
    const [clients] = await db.execute(
      'SELECT * FROM clients ORDER BY name ASC'
    );

    res.json({
      success: true,
      data: clients
    });

  } catch (error) {
    console.error('List clients error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar clientes'
    });
  }
});

// Obter um cliente específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [clients] = await db.execute(
      'SELECT * FROM clients WHERE id = ?',
      [id]
    );

    if (clients.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado'
      });
    }

    res.json({
      success: true,
      data: clients[0]
    });

  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter cliente'
    });
  }
});

// Criar novo cliente
router.post('/', async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Nome e email são obrigatórios'
      });
    }

    // Verificar se já existe cliente com o mesmo email
    const [existing] = await db.execute(
      'SELECT id FROM clients WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Já existe um cliente com este email'
      });
    }

    const [result] = await db.execute(
      'INSERT INTO clients (name, email, phone) VALUES (?, ?, ?)',
      [name, email, phone || null]
    );

    res.json({
      success: true,
      message: 'Cliente criado com sucesso',
      data: {
        id: result.insertId,
        name,
        email,
        phone
      }
    });

  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar cliente'
    });
  }
});

// Atualizar cliente
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Nome e email são obrigatórios'
      });
    }

    // Verificar se já existe outro cliente com o mesmo email
    const [existing] = await db.execute(
      'SELECT id FROM clients WHERE email = ? AND id != ?',
      [email, id]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Já existe outro cliente com este email'
      });
    }

    await db.execute(
      'UPDATE clients SET name = ?, email = ?, phone = ? WHERE id = ?',
      [name, email, phone || null, id]
    );

    res.json({
      success: true,
      message: 'Cliente atualizado com sucesso'
    });

  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar cliente'
    });
  }
});

// Deletar cliente
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o cliente tem sites associados
    const [sites] = await db.execute(
      'SELECT id FROM sites WHERE client_id = ?',
      [id]
    );

    if (sites.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Não é possível deletar o cliente. Existem ${sites.length} site(s) associado(s). Remova os sites primeiro ou altere o cliente dos sites.`
      });
    }

    await db.execute(
      'DELETE FROM clients WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Cliente deletado com sucesso'
    });

  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar cliente'
    });
  }
});

// Obter sites de um cliente
router.get('/:id/sites', async (req, res) => {
  try {
    const { id } = req.params;

    const [sites] = await db.execute(
      'SELECT * FROM sites WHERE client_id = ? ORDER BY domain ASC',
      [id]
    );

    res.json({
      success: true,
      data: sites
    });

  } catch (error) {
    console.error('Get client sites error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter sites do cliente'
    });
  }
});

module.exports = router;



