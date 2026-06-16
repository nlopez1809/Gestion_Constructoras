// routes/comisiones.js
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth, roles } = require('../middleware/auth');
const dayjs = require('dayjs');
const prisma = new PrismaClient();

// GET /api/comisiones?vendedorId=&estado=&mes=
router.get('/', auth, async (req, res) => {
  try {
    const { vendedorId, estado } = req.query;
    const where = {};
    if (vendedorId) where.vendedorId = vendedorId;
    if (estado)     where.estado = estado;

    const comisiones = await prisma.comision.findMany({
      where,
      include: {
        venta: {
          include: {
            cliente: { select: { nombre: true, apellido: true } },
            unidad:  { include: { proyecto: { select: { nombre: true } } } }
          }
        },
        vendedor: { select: { nombre: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(comisiones);
  } catch { res.status(500).json({ error: 'Error al obtener comisiones' }); }
});

// GET /api/comisiones/resumen-vendedor — resumen por vendedor del mes
router.get('/resumen-vendedor', auth, async (req, res) => {
  try {
    const inicio = dayjs().startOf('month').toDate();
    const fin    = dayjs().endOf('month').toDate();

    const comisiones = await prisma.comision.findMany({
      where: { createdAt: { gte: inicio, lte: fin } },
      include: { vendedor: { select: { id: true, nombre: true } } }
    });

    // Agrupar por vendedor
    const mapa = {};
    for (const c of comisiones) {
      const vid = c.vendedorId;
      if (!mapa[vid]) mapa[vid] = { vendedor: c.vendedor, ventas: 0, montoBruto: 0, montoNeto: 0, comisiones: [] };
      mapa[vid].ventas++;
      mapa[vid].montoBruto += c.montoBase;
      mapa[vid].montoNeto  += c.montoNeto;
      mapa[vid].comisiones.push({ id: c.id, montoNeto: c.montoNeto, estado: c.estado });
    }

    res.json(Object.values(mapa));
  } catch { res.status(500).json({ error: 'Error al obtener resumen' }); }
});

// PATCH /api/comisiones/:id/pagar
router.patch('/:id/pagar', auth, roles('ADMIN', 'GERENCIA', 'FINANZAS'), async (req, res) => {
  try {
    const com = await prisma.comision.update({
      where: { id: req.params.id },
      data: { estado: 'PAGADA', fechaPago: new Date() }
    });
    res.json(com);
  } catch { res.status(500).json({ error: 'Error al pagar comisión' }); }
});

module.exports = router;
