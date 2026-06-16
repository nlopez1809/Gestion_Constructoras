// routes/clientes.js — acceso directo a clientes (también en ventas)
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth, roles } = require('../middleware/auth');
const prisma = new PrismaClient();

router.get('/', auth, async (req, res) => {
  try {
    const { q } = req.query;
    const where = q ? {
      OR: [
        { nombre:   { contains: q, mode: 'insensitive' } },
        { apellido: { contains: q, mode: 'insensitive' } },
        { ci:       { contains: q } }
      ]
    } : {};
    const clientes = await prisma.cliente.findMany({ where, orderBy: { nombre: 'asc' } });
    res.json(clientes);
  } catch { res.status(500).json({ error: 'Error al obtener clientes' }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const c = await prisma.cliente.findUnique({
      where: { id: req.params.id },
      include: {
        ventas: {
          include: {
            unidad:   { include: { proyecto: { select: { nombre: true } } } },
            cuotas:   { orderBy: { numero: 'asc' } },
            vendedor: { select: { nombre: true } }
          }
        },
        contratos: { include: { proyecto: { select: { nombre: true } } } }
      }
    });
    if (!c) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(c);
  } catch { res.status(500).json({ error: 'Error al obtener cliente' }); }
});

router.post('/', auth, roles('ADMIN','GERENCIA','COMERCIAL'), async (req, res) => {
  try {
    const c = await prisma.cliente.create({ data: req.body });
    res.status(201).json(c);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'CI ya registrado' });
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

router.put('/:id', auth, roles('ADMIN','GERENCIA','COMERCIAL'), async (req, res) => {
  try {
    const c = await prisma.cliente.update({ where: { id: req.params.id }, data: req.body });
    res.json(c);
  } catch { res.status(500).json({ error: 'Error al actualizar cliente' }); }
});

module.exports = router;
