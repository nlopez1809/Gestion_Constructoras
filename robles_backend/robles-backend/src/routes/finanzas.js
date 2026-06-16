// routes/finanzas.js — Ingresos, egresos, flujo de caja y tipo de cambio

const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth, roles } = require('../middleware/auth');
const dayjs = require('dayjs');
const prisma = new PrismaClient();

// GET /api/finanzas/movimientos
router.get('/movimientos', auth, async (req, res) => {
  try {
    const { tipo, proyectoId, desde, hasta, page = 1, limit = 20 } = req.query;
    const where = {};
    if (tipo)       where.tipo = tipo;
    if (proyectoId) where.proyectoId = proyectoId;
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha.gte = new Date(desde);
      if (hasta) where.fecha.lte = new Date(hasta);
    }

    const [movimientos, total] = await Promise.all([
      prisma.movimientoFinanciero.findMany({
        where,
        include: { registradoPor: { select: { nombre: true } } },
        skip: (page - 1) * limit,
        take: parseInt(limit),
        orderBy: { fecha: 'desc' }
      }),
      prisma.movimientoFinanciero.count({ where })
    ]);

    res.json({ movimientos, total, pagina: parseInt(page) });
  } catch { res.status(500).json({ error: 'Error al obtener movimientos' }); }
});

// POST /api/finanzas/movimientos
router.post('/movimientos', auth, roles('ADMIN', 'GERENCIA', 'FINANZAS'), async (req, res) => {
  try {
    const { tipo, concepto, proyectoId, categoria, monedaOrigen,
            montoUSD, metodo, referencia, fecha, observacion } = req.body;

    const tc = await prisma.tipoCambioHistorico.findFirst({
      where: { periodo: dayjs().format('YYYY-MM') }
    });
    const tipoCambio = tc?.tcOficial || 7.05;

    const ultima = await prisma.movimientoFinanciero.findFirst({
      orderBy: { createdAt: 'desc' }, select: { numero: true }
    });
    const num = ultima ? parseInt(ultima.numero.split('-')[1]) + 1 : 1;
    const numero = `M-${String(num).padStart(4, '0')}`;

    const movimiento = await prisma.movimientoFinanciero.create({
      data: {
        numero, tipo, concepto, proyectoId, categoria,
        monedaOrigen: monedaOrigen || 'USD',
        montoUSD, tipoCambio,
        montoBs: montoUSD * tipoCambio,
        metodo, referencia,
        fecha: new Date(fecha || Date.now()),
        registradoPorId: req.usuario.id,
        observacion
      }
    });
    res.status(201).json(movimiento);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar movimiento' });
  }
});

// GET /api/finanzas/flujo — Flujo de caja por mes
router.get('/flujo', auth, async (req, res) => {
  try {
    const { meses = 6 } = req.query;
    const ahora = dayjs();
    const resultado = [];

    let saldoAcumulado = 0;

    for (let i = parseInt(meses) - 1; i >= 0; i--) {
      const mes = ahora.subtract(i, 'month');
      const inicio = mes.startOf('month').toDate();
      const fin    = mes.endOf('month').toDate();

      const [ing, egr] = await Promise.all([
        prisma.movimientoFinanciero.aggregate({
          where: { tipo: 'INGRESO', fecha: { gte: inicio, lte: fin } },
          _sum: { montoUSD: true }
        }),
        prisma.movimientoFinanciero.aggregate({
          where: { tipo: 'EGRESO', fecha: { gte: inicio, lte: fin } },
          _sum: { montoUSD: true }
        })
      ]);

      const ingresos = ing._sum.montoUSD || 0;
      const egresos  = egr._sum.montoUSD || 0;
      const neto     = ingresos - egresos;
      saldoAcumulado += neto;

      resultado.push({
        mes:     mes.format('YYYY-MM'),
        mesLabel: mes.format('MMM YYYY'),
        ingresos,
        egresos,
        neto,
        saldoFinal: saldoAcumulado
      });
    }

    res.json(resultado);
  } catch { res.status(500).json({ error: 'Error al obtener flujo de caja' }); }
});

// GET /api/finanzas/estado-resultados — Estado de resultados del mes
router.get('/estado-resultados', auth, async (req, res) => {
  try {
    const { mes, anio } = req.query;
    const fecha  = dayjs(`${anio || dayjs().year()}-${mes || dayjs().month() + 1}-01`);
    const inicio = fecha.startOf('month').toDate();
    const fin    = fecha.endOf('month').toDate();

    const [ingresos, costoVentas, gastosOp] = await Promise.all([
      prisma.movimientoFinanciero.groupBy({
        by: ['categoria'],
        where: { tipo: 'INGRESO', fecha: { gte: inicio, lte: fin } },
        _sum: { montoUSD: true }
      }),
      prisma.gasto.groupBy({
        by: ['categoria'],
        where: { tipo: 'Directo', fecha: { gte: inicio, lte: fin } },
        _sum: { montoUSD: true }
      }),
      prisma.gasto.groupBy({
        by: ['categoria'],
        where: { tipo: 'Indirecto', fecha: { gte: inicio, lte: fin } },
        _sum: { montoUSD: true }
      })
    ]);

    const totalIngresos    = ingresos.reduce((s, i) => s + (i._sum.montoUSD || 0), 0);
    const totalCostoVentas = costoVentas.reduce((s, i) => s + (i._sum.montoUSD || 0), 0);
    const utilidadBruta    = totalIngresos - totalCostoVentas;
    const totalGastosOp    = gastosOp.reduce((s, i) => s + (i._sum.montoUSD || 0), 0);
    const utilidadNeta     = utilidadBruta - totalGastosOp;

    res.json({
      periodo: fecha.format('MMMM YYYY'),
      ingresos: { items: ingresos, total: totalIngresos },
      costoVentas: { items: costoVentas, total: totalCostoVentas },
      utilidadBruta,
      margenBruto: totalIngresos > 0 ? (utilidadBruta / totalIngresos) * 100 : 0,
      gastosOperativos: { items: gastosOp, total: totalGastosOp },
      utilidadNeta,
      margenNeto: totalIngresos > 0 ? (utilidadNeta / totalIngresos) * 100 : 0
    });
  } catch { res.status(500).json({ error: 'Error al generar estado de resultados' }); }
});

// ── TIPO DE CAMBIO ──

// GET /api/finanzas/tc — historial tipo de cambio
router.get('/tc', auth, async (req, res) => {
  try {
    const historial = await prisma.tipoCambioHistorico.findMany({
      orderBy: { periodo: 'desc' },
      take: 12
    });
    res.json(historial);
  } catch { res.status(500).json({ error: 'Error al obtener tipo de cambio' }); }
});

// GET /api/finanzas/tc/vigente
router.get('/tc/vigente', auth, async (req, res) => {
  try {
    const tc = await prisma.tipoCambioHistorico.findFirst({
      where: { periodo: dayjs().format('YYYY-MM') }
    });
    res.json({ tcOficial: tc?.tcOficial || 7.05, periodo: dayjs().format('YYYY-MM') });
  } catch { res.status(500).json({ error: 'Error al obtener TC' }); }
});

// POST /api/finanzas/tc — registrar nuevo TC
router.post('/tc', auth, roles('ADMIN', 'GERENCIA', 'FINANZAS'), async (req, res) => {
  try {
    const { periodo, tcOficial, tcParalelo, fuente } = req.body;
    const tc = await prisma.tipoCambioHistorico.upsert({
      where: { periodo },
      create: { periodo, tcOficial, tcParalelo, fuente: fuente || 'BCB' },
      update: { tcOficial, tcParalelo, fuente }
    });
    res.json(tc);
  } catch { res.status(500).json({ error: 'Error al registrar tipo de cambio' }); }
});

// GET /api/finanzas/saldo-caja — saldo actual en caja
router.get('/saldo-caja', auth, async (req, res) => {
  try {
    const [ingresos, egresos, tc] = await Promise.all([
      prisma.movimientoFinanciero.aggregate({
        where: { tipo: 'INGRESO' },
        _sum: { montoUSD: true }
      }),
      prisma.movimientoFinanciero.aggregate({
        where: { tipo: 'EGRESO' },
        _sum: { montoUSD: true }
      }),
      prisma.tipoCambioHistorico.findFirst({
        where: { periodo: dayjs().format('YYYY-MM') }
      })
    ]);

    const totalUSD = (ingresos._sum.montoUSD || 0) - (egresos._sum.montoUSD || 0);
    const tcVal    = tc?.tcOficial || 7.05;

    res.json({
      saldoUSD: totalUSD,
      saldoBs:  totalUSD * tcVal,
      tcVigente: tcVal
    });
  } catch { res.status(500).json({ error: 'Error al obtener saldo' }); }
});

module.exports = router;
