// routes/cuotas.js
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth, roles } = require('../middleware/auth');
const prisma = new PrismaClient();

// GET /api/cuotas?ventaId=&pagado=&vencidas=
router.get('/', auth, async (req, res) => {
  try {
    const { ventaId, pagado, vencidas } = req.query;
    const where = {};
    if (ventaId) where.ventaId = ventaId;
    if (pagado !== undefined) where.pagado = pagado === 'true';
    if (vencidas === 'true') where.vencimiento = { lt: new Date() };
    const cuotas = await prisma.cuota.findMany({
      where,
      include: { venta: { include: { cliente: { select:{ nombre:true, apellido:true } }, unidad: { include:{ proyecto:{ select:{ nombre:true } } } } } } },
      orderBy: { vencimiento: 'asc' }
    });
    res.json(cuotas);
  } catch { res.status(500).json({ error: 'Error al obtener cuotas' }); }
});

// POST /api/cuotas/pagar/:id — alias para pagar cuota
router.post('/pagar/:id', auth, roles('ADMIN','GERENCIA','FINANZAS'), async (req, res) => {
  try {
    const cuota = await prisma.cuota.update({
      where: { id: req.params.id },
      data: { pagado: true, fechaPago: new Date(), metodoPago: req.body.metodoPago, comprobante: req.body.comprobante }
    });
    res.json(cuota);
  } catch { res.status(500).json({ error: 'Error al registrar pago' }); }
});

module.exports = router;
