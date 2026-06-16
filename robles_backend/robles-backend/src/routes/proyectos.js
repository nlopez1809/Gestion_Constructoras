// routes/proyectos.js — CRUD proyectos, etapas y unidades

const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth, roles } = require('../middleware/auth');
const prisma = new PrismaClient();

// GET /api/proyectos
router.get('/', auth, async (req, res) => {
  try {
    const proyectos = await prisma.proyecto.findMany({
      include: {
        unidades: { select: { id: true, estado: true } },
        etapas:   { orderBy: { orden: 'asc' } },
        _count:   { select: { gastos: true, ordenes: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const data = proyectos.map(p => ({
      ...p,
      totalUnidades:    p.unidades.length,
      unidadesVendidas: p.unidades.filter(u => u.estado === 'VENDIDO').length,
      unidadesReservadas: p.unidades.filter(u => u.estado === 'RESERVADO').length,
      unidadesDisponibles: p.unidades.filter(u => u.estado === 'DISPONIBLE').length,
    }));

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener proyectos' });
  }
});

// GET /api/proyectos/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: req.params.id },
      include: {
        unidades: { orderBy: [{ piso: 'asc' }, { codigo: 'asc' }] },
        etapas:   { orderBy: { orden: 'asc' } },
        presupuestoItems: true
      }
    });
    if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });

    // Calcular ejecutado total
    const ejecutado = await prisma.gasto.aggregate({
      where: { proyectoId: req.params.id },
      _sum: { montoUSD: true }
    });

    res.json({ ...proyecto, ejecutadoUSD: ejecutado._sum.montoUSD || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener proyecto' });
  }
});

// POST /api/proyectos
router.post('/', auth, roles('ADMIN', 'GERENCIA'), async (req, res) => {
  try {
    const {
      codigo, nombre, descripcion, ubicacion, ciudad,
      totalUnidades, totalM2, presupuesto, fechaInicio,
      fechaEntrega, estado
    } = req.body;

    const proyecto = await prisma.proyecto.create({
      data: {
        codigo, nombre, descripcion, ubicacion,
        ciudad: ciudad || 'Cochabamba',
        totalUnidades, totalM2, presupuesto,
        fechaInicio: new Date(fechaInicio),
        fechaEntrega: new Date(fechaEntrega),
        estado: estado || 'EN_PLANIFICACION'
      }
    });
    res.status(201).json(proyecto);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Código de proyecto ya existe' });
    res.status(500).json({ error: 'Error al crear proyecto' });
  }
});

// PUT /api/proyectos/:id
router.put('/:id', auth, roles('ADMIN', 'GERENCIA', 'OBRA'), async (req, res) => {
  try {
    const proyecto = await prisma.proyecto.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        fechaInicio:  req.body.fechaInicio  ? new Date(req.body.fechaInicio)  : undefined,
        fechaEntrega: req.body.fechaEntrega ? new Date(req.body.fechaEntrega) : undefined
      }
    });
    res.json(proyecto);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar proyecto' });
  }
});

// PATCH /api/proyectos/:id/avance
router.patch('/:id/avance', auth, roles('ADMIN', 'GERENCIA', 'OBRA'), async (req, res) => {
  try {
    const { avancePct } = req.body;
    if (avancePct < 0 || avancePct > 100) return res.status(400).json({ error: 'Avance debe ser 0-100' });
    const proyecto = await prisma.proyecto.update({
      where: { id: req.params.id },
      data: { avancePct }
    });
    res.json({ avancePct: proyecto.avancePct });
  } catch {
    res.status(500).json({ error: 'Error al actualizar avance' });
  }
});

// GET /api/proyectos/:id/costos — resumen de costos del proyecto
router.get('/:id/costos', auth, async (req, res) => {
  try {
    const [presupuesto, gastosPorCategoria, gastosRecientes] = await Promise.all([
      prisma.presupuestoItem.findMany({ where: { proyectoId: req.params.id } }),
      prisma.gasto.groupBy({
        by: ['categoria'],
        where: { proyectoId: req.params.id },
        _sum: { montoUSD: true }
      }),
      prisma.gasto.findMany({
        where: { proyectoId: req.params.id },
        orderBy: { fecha: 'desc' },
        take: 10,
        include: { registradoPor: { select: { nombre: true } } }
      })
    ]);

    const totalPresupuesto = presupuesto.reduce((s, i) => s + i.montoUSD, 0);
    const totalEjecutado   = gastosPorCategoria.reduce((s, g) => s + (g._sum.montoUSD || 0), 0);

    res.json({
      totalPresupuesto,
      totalEjecutado,
      saldo: totalPresupuesto - totalEjecutado,
      pctEjecutado: totalPresupuesto > 0 ? (totalEjecutado / totalPresupuesto) * 100 : 0,
      porCategoria: gastosPorCategoria.map(g => ({
        categoria: g.categoria,
        ejecutado: g._sum.montoUSD || 0,
        presupuestado: presupuesto.find(p => p.categoria === g.categoria)?.montoUSD || 0
      })),
      gastosRecientes
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener costos del proyecto' });
  }
});

// ── ETAPAS ──

// GET /api/proyectos/:id/etapas
router.get('/:id/etapas', auth, async (req, res) => {
  try {
    const etapas = await prisma.etapaObra.findMany({
      where: { proyectoId: req.params.id },
      orderBy: { orden: 'asc' }
    });
    res.json(etapas);
  } catch { res.status(500).json({ error: 'Error al obtener etapas' }); }
});

// POST /api/proyectos/:id/etapas
router.post('/:id/etapas', auth, roles('ADMIN', 'GERENCIA', 'OBRA'), async (req, res) => {
  try {
    const etapa = await prisma.etapaObra.create({
      data: { ...req.body, proyectoId: req.params.id }
    });
    res.status(201).json(etapa);
  } catch { res.status(500).json({ error: 'Error al crear etapa' }); }
});

// PATCH /api/proyectos/:proyId/etapas/:etapaId
router.patch('/:proyId/etapas/:etapaId', auth, roles('ADMIN', 'GERENCIA', 'OBRA'), async (req, res) => {
  try {
    const etapa = await prisma.etapaObra.update({
      where: { id: req.params.etapaId },
      data: req.body
    });
    res.json(etapa);
  } catch { res.status(500).json({ error: 'Error al actualizar etapa' }); }
});

module.exports = router;
