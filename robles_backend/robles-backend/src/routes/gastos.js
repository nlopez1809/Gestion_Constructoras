// routes/gastos.js — Control de costos y gastos por proyecto

const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth, roles } = require('../middleware/auth');
const dayjs = require('dayjs');
const prisma = new PrismaClient();

// GET /api/gastos
router.get('/', auth, async (req, res) => {
  try {
    const { proyectoId, categoria, tipo, desde, hasta, page = 1, limit = 20 } = req.query;
    const where = {};
    if (proyectoId) where.proyectoId = proyectoId;
    if (categoria)  where.categoria  = categoria;
    if (tipo)       where.tipo       = tipo;
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha.gte = new Date(desde);
      if (hasta) where.fecha.lte = new Date(hasta);
    }

    const [gastos, total] = await Promise.all([
      prisma.gasto.findMany({
        where,
        include: {
          proyecto:      { select: { nombre: true } },
          registradoPor: { select: { nombre: true } }
        },
        skip: (page - 1) * limit,
        take: parseInt(limit),
        orderBy: { fecha: 'desc' }
      }),
      prisma.gasto.count({ where })
    ]);

    res.json({ gastos, total, pagina: parseInt(page) });
  } catch { res.status(500).json({ error: 'Error al obtener gastos' }); }
});

// POST /api/gastos
router.post('/', auth, roles('ADMIN', 'GERENCIA', 'FINANZAS', 'OBRA'), async (req, res) => {
  try {
    const { proyectoId, descripcion, categoria, tipo, montoUSD, fecha, ocReferencia, factura, observacion } = req.body;

    const tc = await prisma.tipoCambioHistorico.findFirst({
      where: { periodo: dayjs().format('YYYY-MM') }
    });
    const tipoCambio = tc?.tcOficial || 7.05;

    const ultima = await prisma.gasto.findFirst({
      orderBy: { createdAt: 'desc' }, select: { numero: true }
    });
    const num    = ultima ? parseInt(ultima.numero.split('-')[1]) + 1 : 1;
    const numero = `G-${String(num).padStart(4, '0')}`;

    const gasto = await prisma.gasto.create({
      data: {
        numero, proyectoId, descripcion, categoria,
        tipo: tipo || 'Directo',
        montoUSD, tipoCambio,
        montoBs: montoUSD * tipoCambio,
        fecha: new Date(fecha || Date.now()),
        registradoPorId: req.usuario.id,
        ocReferencia, factura, observacion
      }
    });

    // Registrar egreso financiero automáticamente
    await prisma.movimientoFinanciero.create({
      data: {
        numero:    `M-G-${numero}`,
        tipo:      'EGRESO',
        concepto:  descripcion,
        proyectoId,
        categoria,
        monedaOrigen: 'USD',
        montoUSD,
        tipoCambio,
        montoBs: montoUSD * tipoCambio,
        metodo:   'Transferencia',
        referencia: factura,
        fecha:    new Date(fecha || Date.now()),
        registradoPorId: req.usuario.id
      }
    });

    res.status(201).json(gasto);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar gasto' });
  }
});

// GET /api/gastos/resumen — resumen de costos por proyecto
router.get('/resumen', auth, async (req, res) => {
  try {
    const proyectos = await prisma.proyecto.findMany({
      include: { presupuestoItems: true }
    });

    const data = await Promise.all(proyectos.map(async (p) => {
      const [ejecutado, porCategoria] = await Promise.all([
        prisma.gasto.aggregate({
          where: { proyectoId: p.id },
          _sum: { montoUSD: true }
        }),
        prisma.gasto.groupBy({
          by: ['categoria'],
          where: { proyectoId: p.id },
          _sum: { montoUSD: true }
        })
      ]);

      const totalPres = p.presupuestoItems.reduce((s, i) => s + i.montoUSD, 0) || p.presupuesto;
      const totalEjec = ejecutado._sum.montoUSD || 0;

      return {
        proyecto:     { id: p.id, nombre: p.nombre, estado: p.estado },
        presupuesto:  totalPres,
        ejecutado:    totalEjec,
        saldo:        totalPres - totalEjec,
        pctEjecutado: totalPres > 0 ? (totalEjec / totalPres) * 100 : 0,
        sobrecosto:   totalEjec > totalPres,
        porCategoria: porCategoria.map(g => ({
          categoria:    g.categoria,
          ejecutado:    g._sum.montoUSD || 0,
          presupuestado: p.presupuestoItems.find(i => i.categoria === g.categoria)?.montoUSD || 0
        }))
      };
    }));

    res.json(data);
  } catch { res.status(500).json({ error: 'Error al obtener resumen de costos' }); }
});

// GET /api/gastos/desviaciones — desvíos respecto al presupuesto
router.get('/desviaciones', auth, async (req, res) => {
  try {
    const presupuestos = await prisma.presupuestoItem.findMany({
      include: { proyecto: { select: { nombre: true } } }
    });

    const desviaciones = await Promise.all(presupuestos.map(async (p) => {
      const ejecutado = await prisma.gasto.aggregate({
        where: { proyectoId: p.proyectoId, categoria: p.categoria },
        _sum: { montoUSD: true }
      });
      const ejec = ejecutado._sum.montoUSD || 0;
      const desv = p.montoUSD - ejec;
      const pct  = p.montoUSD > 0 ? (ejec / p.montoUSD) * 100 : 0;

      return {
        proyecto:     p.proyecto.nombre,
        proyectoId:   p.proyectoId,
        categoria:    p.categoria,
        presupuesto:  p.montoUSD,
        ejecutado:    ejec,
        desviacion:   desv,
        pctUso:       pct,
        estado:       ejec > p.montoUSD ? 'SOBRECOSTO'
                    : pct > 80          ? 'ATENCION'
                    :                    'OK'
      };
    }));

    res.json(desviaciones.sort((a, b) => a.desviacion - b.desviacion));
  } catch { res.status(500).json({ error: 'Error al calcular desviaciones' }); }
});

// GET /api/gastos/rentabilidad — rentabilidad por proyecto
router.get('/rentabilidad', auth, async (req, res) => {
  try {
    const proyectos = await prisma.proyecto.findMany({
      include: {
        unidades: {
          include: {
            ventas: { select: { precioFinal: true } }
          }
        }
      }
    });

    const data = await Promise.all(proyectos.map(async (p) => {
      const ejecutado = await prisma.gasto.aggregate({
        where: { proyectoId: p.id },
        _sum: { montoUSD: true }
      });

      const ingresoProyectado = p.unidades.reduce((s, u) => {
        const precioVenta = u.ventas.length > 0
          ? u.ventas[0].precioFinal
          : u.precioBase;
        return s + precioVenta;
      }, 0);

      const costoTotal   = ejecutado._sum.montoUSD || p.presupuesto;
      const margenBruto  = ingresoProyectado - costoTotal;
      const pctMargen    = ingresoProyectado > 0 ? (margenBruto / ingresoProyectado) * 100 : 0;

      return {
        proyecto:           { id: p.id, nombre: p.nombre },
        ingresoProyectado,
        costoTotal,
        margenBruto,
        pctMargenBruto:     pctMargen,
        pctMargenNeto:      pctMargen * 0.65, // estimación impuestos ~35%
        costoPorM2:         p.totalM2 > 0 ? costoTotal / p.totalM2 : 0,
        rentabilidad:       pctMargen >= 25 ? 'ALTA' : pctMargen >= 15 ? 'MEDIA' : 'BAJA'
      };
    }));

    res.json(data);
  } catch { res.status(500).json({ error: 'Error al calcular rentabilidad' }); }
});

module.exports = router;
