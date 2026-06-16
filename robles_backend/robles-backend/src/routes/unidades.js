// routes/unidades.js — CRUD unidades de cada proyecto
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth, roles } = require('../middleware/auth');
const prisma = new PrismaClient();

// GET /api/unidades?proyectoId=&estado=
router.get('/', auth, async (req, res) => {
  try {
    const { proyectoId, estado, piso } = req.query;
    const where = {};
    if (proyectoId) where.proyectoId = proyectoId;
    if (estado)     where.estado     = estado;
    if (piso)       where.piso       = parseInt(piso);
    const unidades = await prisma.unidad.findMany({ where, orderBy: [{ piso:'asc'},{codigo:'asc'}] });
    res.json(unidades);
  } catch { res.status(500).json({ error: 'Error al obtener unidades' }); }
});

// POST /api/unidades
router.post('/', auth, roles('ADMIN','GERENCIA'), async (req, res) => {
  try {
    const u = await prisma.unidad.create({ data: req.body });
    res.status(201).json(u);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Código ya existe en este proyecto' });
    res.status(500).json({ error: 'Error al crear unidad' });
  }
});

// PUT /api/unidades/:id
router.put('/:id', auth, roles('ADMIN','GERENCIA'), async (req, res) => {
  try {
    const u = await prisma.unidad.update({ where:{ id:req.params.id }, data: req.body });
    res.json(u);
  } catch { res.status(500).json({ error: 'Error al actualizar unidad' }); }
});

// PATCH /api/unidades/:id/estado
router.patch('/:id/estado', auth, roles('ADMIN','GERENCIA','COMERCIAL'), async (req, res) => {
  try {
    const { estado } = req.body;
    const u = await prisma.unidad.update({ where:{ id:req.params.id }, data:{ estado } });
    res.json(u);
  } catch { res.status(500).json({ error: 'Error al cambiar estado' }); }
});

module.exports = router;
