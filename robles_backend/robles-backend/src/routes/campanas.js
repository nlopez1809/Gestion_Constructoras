// routes/campanas.js — Campañas de marketing y leads

const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth, roles } = require('../middleware/auth');
const dayjs = require('dayjs');
const prisma = new PrismaClient();

// ── CAMPAÑAS ──

// GET /api/campanas
router.get('/', auth, async (req, res) => {
  try {
    const { canal, estado } = req.query;
    const where = {};
    if (canal)  where.canal  = canal;
    if (estado) where.estado = estado;

    const campanas = await prisma.campana.findMany({
      where,
      include: {
        _count: { select: { leads: true } },
        leads:  {
          select: { estado: true },
          where:  { estado: 'CONVERTIDO' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const data = campanas.map(c => ({
      ...c,
      totalLeads:    c._count.leads,
      conversiones:  c.leads.length,
      tasaConversion: c._count.leads > 0
        ? (c.leads.length / c._count.leads) * 100 : 0,
      costoPorLead:  c._count.leads > 0 ? c.gastado / c._count.leads : 0,
      roas:          c.gastado > 0
        ? (c.leads.length * 80000) / c.gastado  // precio promedio dpto aprox
        : 0
    }));

    res.json(data);
  } catch { res.status(500).json({ error: 'Error al obtener campañas' }); }
});

// POST /api/campanas
router.post('/', auth, roles('ADMIN', 'GERENCIA', 'COMERCIAL'), async (req, res) => {
  try {
    const campana = await prisma.campana.create({
      data: {
        ...req.body,
        fechaInicio: new Date(req.body.fechaInicio),
        fechaFin:    req.body.fechaFin ? new Date(req.body.fechaFin) : null
      }
    });
    res.status(201).json(campana);
  } catch { res.status(500).json({ error: 'Error al crear campaña' }); }
});

// PATCH /api/campanas/:id/gasto — actualizar gasto ejecutado
router.patch('/:id/gasto', auth, roles('ADMIN', 'GERENCIA', 'COMERCIAL'), async (req, res) => {
  try {
    const campana = await prisma.campana.update({
      where: { id: req.params.id },
      data: { gastado: req.body.gastado, estado: req.body.estado }
    });
    res.json(campana);
  } catch { res.status(500).json({ error: 'Error al actualizar gasto' }); }
});

// GET /api/campanas/resumen — KPIs de marketing del mes
router.get('/resumen', auth, async (req, res) => {
  try {
    const inicio = dayjs().startOf('month').toDate();
    const fin    = dayjs().endOf('month').toDate();

    const [leadsTotal, leadsConvertidos, inversion] = await Promise.all([
      prisma.lead.count({ where: { createdAt: { gte: inicio, lte: fin } } }),
      prisma.lead.count({ where: { estado: 'CONVERTIDO', updatedAt: { gte: inicio, lte: fin } } }),
      prisma.campana.aggregate({
        where: { estado: 'ACTIVA' }, _sum: { gastado: true }
      })
    ]);

    // Leads por canal
    const porCanal = await prisma.lead.groupBy({
      by: ['canal'],
      where: { createdAt: { gte: inicio, lte: fin } },
      _count: { id: true }
    });

    res.json({
      leadsTotal,
      leadsConvertidos,
      tasaConversion: leadsTotal > 0 ? (leadsConvertidos / leadsTotal) * 100 : 0,
      inversionMes:   inversion._sum.gastado || 0,
      porCanal:       porCanal.map(c => ({ canal: c.canal, total: c._count.id }))
    });
  } catch { res.status(500).json({ error: 'Error al obtener resumen marketing' }); }
});

// ── LEADS ──
const leadsRouter = require('express').Router();

// GET /api/leads
leadsRouter.get('/', auth, async (req, res) => {
  try {
    const { canal, estado, vendedorId, campanaId, q, page = 1, limit = 20 } = req.query;
    const where = {};
    if (canal)      where.canal      = canal;
    if (estado)     where.estado     = estado;
    if (vendedorId) where.vendedorId = vendedorId;
    if (campanaId)  where.campanaId  = campanaId;
    if (q) where.OR = [
      { nombre:   { contains: q, mode: 'insensitive' } },
      { apellido: { contains: q, mode: 'insensitive' } },
      { telefono: { contains: q } },
      { email:    { contains: q, mode: 'insensitive' } }
    ];

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          campana:  { select: { nombre: true, canal: true } },
          vendedor: { select: { nombre: true } }
        },
        skip: (page - 1) * limit,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.lead.count({ where })
    ]);

    res.json({ leads, total, pagina: parseInt(page) });
  } catch { res.status(500).json({ error: 'Error al obtener leads' }); }
});

// POST /api/leads
leadsRouter.post('/', auth, roles('ADMIN', 'GERENCIA', 'COMERCIAL'), async (req, res) => {
  try {
    const lead = await prisma.lead.create({ data: req.body });
    res.status(201).json(lead);
  } catch { res.status(500).json({ error: 'Error al crear lead' }); }
});

// PATCH /api/leads/:id/estado
leadsRouter.patch('/:id/estado', auth, roles('ADMIN', 'GERENCIA', 'COMERCIAL'), async (req, res) => {
  try {
    const { estado, clienteId, observacion } = req.body;
    const data = { estado };
    if (observacion) data.observacion = observacion;

    // Si se convierte, vincular con cliente
    if (estado === 'CONVERTIDO' && clienteId) data.clienteId = clienteId;

    const lead = await prisma.lead.update({ where: { id: req.params.id }, data });
    res.json(lead);
  } catch { res.status(500).json({ error: 'Error al actualizar lead' }); }
});

// GET /api/leads/embudo — funnel de conversión
leadsRouter.get('/embudo', auth, async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const where = {};
    if (desde || hasta) {
      where.createdAt = {};
      if (desde) where.createdAt.gte = new Date(desde);
      if (hasta) where.createdAt.lte = new Date(hasta);
    }

    const conteos = await prisma.lead.groupBy({
      by: ['estado'], where, _count: { id: true }
    });

    const total = conteos.reduce((s, e) => s + e._count.id, 0);
    const mapa  = Object.fromEntries(conteos.map(e => [e.estado, e._count.id]));

    const etapas = [
      { etapa: 'NUEVO',          label: 'Leads generados',   count: total },
      { etapa: 'CONTACTADO',     label: 'Contactados',        count: mapa.CONTACTADO || 0 },
      { etapa: 'INTERESADO',     label: 'Interesados',        count: mapa.INTERESADO || 0 },
      { etapa: 'EN_NEGOCIACION', label: 'En negociación',     count: mapa.EN_NEGOCIACION || 0 },
      { etapa: 'CONVERTIDO',     label: 'Convertidos/Ventas', count: mapa.CONVERTIDO || 0 }
    ].map(e => ({
      ...e,
      pct: total > 0 ? (e.count / total) * 100 : 0
    }));

    res.json({ total, etapas, perdidos: mapa.PERDIDO || 0 });
  } catch { res.status(500).json({ error: 'Error al obtener embudo' }); }
});

module.exports = { campanasRouter: router, leadsRouter };
