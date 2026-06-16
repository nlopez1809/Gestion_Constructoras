// routes/dashboard.js — KPIs consolidados para el dashboard principal

const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth } = require('../middleware/auth');
const dayjs = require('dayjs');

const prisma = new PrismaClient();

// GET /api/dashboard — KPIs principales
router.get('/', auth, async (req, res) => {
  try {
    const ahora = dayjs();
    const inicioMes = ahora.startOf('month').toDate();
    const finMes    = ahora.endOf('month').toDate();

    // Proyectos activos
    const proyectos = await prisma.proyecto.findMany({
      where: { estado: { in: ['EN_PLANIFICACION', 'EN_OBRA'] } },
      select: { id: true, nombre: true, avancePct: true, presupuesto: true, estado: true }
    });

    // Ingresos del mes
    const ingresosMes = await prisma.movimientoFinanciero.aggregate({
      where: { tipo: 'INGRESO', fecha: { gte: inicioMes, lte: finMes } },
      _sum: { montoUSD: true }
    });

    // Egresos del mes
    const egresosMes = await prisma.movimientoFinanciero.aggregate({
      where: { tipo: 'EGRESO', fecha: { gte: inicioMes, lte: finMes } },
      _sum: { montoUSD: true }
    });

    // Ventas del mes
    const ventasMes = await prisma.venta.count({
      where: { fechaVenta: { gte: inicioMes, lte: finMes } }
    });

    // Empleados activos
    const empleados = await prisma.empleado.count({ where: { estado: 'ACTIVO' } });

    // Planilla del mes
    const planilla = await prisma.planilla.findUnique({
      where: { periodo: ahora.format('YYYY-MM') },
      select: { totalNeto: true }
    });

    // Pagos vencidos
    const cuotasVencidas = await prisma.cuota.findMany({
      where: { pagado: false, vencimiento: { lt: new Date() } },
      include: {
        venta: {
          include: {
            cliente: { select: { nombre: true, apellido: true } },
            unidad: { include: { proyecto: { select: { nombre: true } } } }
          }
        }
      },
      take: 5,
      orderBy: { vencimiento: 'asc' }
    });

    // Alertas legales próximas (30 días)
    const limite = ahora.add(30, 'day').toDate();
    const contratosVencen = await prisma.contratoProveedor.findMany({
      where: { fechaVencimiento: { lte: limite, gte: new Date() } },
      include: { proveedor: { select: { nombre: true } } },
      orderBy: { fechaVencimiento: 'asc' }
    });

    // TC vigente
    const tcActual = await prisma.tipoCambioHistorico.findFirst({
      where: { periodo: ahora.format('YYYY-MM') },
      select: { tcOficial: true }
    });

    // Últimos 6 meses ingresos/egresos para gráfico
    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const m = ahora.subtract(i, 'month');
      const inicio = m.startOf('month').toDate();
      const fin = m.endOf('month').toDate();
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
      meses.push({
        mes: m.format('MMM'),
        ingresos: ing._sum.montoUSD || 0,
        egresos: egr._sum.montoUSD || 0,
        neto: (ing._sum.montoUSD || 0) - (egr._sum.montoUSD || 0)
      });
    }

    res.json({
      kpis: {
        proyectosActivos:  proyectos.length,
        ingresosMes:       ingresosMes._sum.montoUSD || 0,
        egresosMes:        egresosMes._sum.montoUSD || 0,
        flujoNeto:         (ingresosMes._sum.montoUSD || 0) - (egresosMes._sum.montoUSD || 0),
        ventasMes,
        empleadosActivos:  empleados,
        planillaMes:       planilla?.totalNeto || 0,
        tcVigente:         tcActual?.tcOficial || parseFloat(process.env.TC_DEFAULT) || 7.05,
      },
      proyectos,
      cuotasVencidas: cuotasVencidas.map(c => ({
        id: c.id,
        cliente: `${c.venta.cliente.nombre} ${c.venta.cliente.apellido}`,
        proyecto: c.venta.unidad.proyecto.nombre,
        monto: c.monto,
        vencimiento: c.vencimiento,
        diasVencido: dayjs().diff(dayjs(c.vencimiento), 'day')
      })),
      alertasLegales: contratosVencen.map(c => ({
        id: c.id,
        descripcion: `Contrato ${c.proveedor.nombre}`,
        vencimiento: c.fechaVencimiento,
        diasRestantes: dayjs(c.fechaVencimiento).diff(dayjs(), 'day')
      })),
      graficoMeses: meses
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cargar dashboard' });
  }
});

module.exports = router;
