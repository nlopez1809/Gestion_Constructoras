// routes/planilla.js
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth, roles } = require('../middleware/auth');
const prisma = new PrismaClient();

// GET /api/planilla?periodo=2026-05
router.get('/', auth, roles('ADMIN','GERENCIA','RRHH','FINANZAS'), async (req, res) => {
  try {
    const { periodo } = req.query;
    const where = {};
    if (periodo) where.periodo = periodo;
    const planillas = await prisma.planilla.findMany({
      where,
      include: {
        items: {
          include: {
            empleado: { select: { nombre: true, apellido: true, cargo: true, ci: true, proyectoId: true } }
          }
        }
      },
      orderBy: { periodo: 'desc' },
      take: 12
    });
    res.json(planillas);
  } catch { res.status(500).json({ error: 'Error al obtener planillas' }); }
});

// GET /api/planilla/:id
router.get('/:id', auth, roles('ADMIN','GERENCIA','RRHH','FINANZAS'), async (req, res) => {
  try {
    const planilla = await prisma.planilla.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: {
            empleado: { select: { nombre: true, apellido: true, cargo: true, ci: true } }
          },
          orderBy: { empleado: { nombre: 'asc' } }
        }
      }
    });
    if (!planilla) return res.status(404).json({ error: 'Planilla no encontrada' });
    res.json(planilla);
  } catch { res.status(500).json({ error: 'Error al obtener planilla' }); }
});

// PATCH /api/planilla/:id/pagar
router.patch('/:id/pagar', auth, roles('ADMIN','GERENCIA'), async (req, res) => {
  try {
    const p = await prisma.planilla.update({ where:{ id: req.params.id }, data:{ estado: 'PAGADA' } });
    res.json(p);
  } catch { res.status(500).json({ error: 'Error al marcar como pagada' }); }
});

module.exports = router;
