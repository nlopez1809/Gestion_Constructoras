// routes/ventas.js — Ventas, clientes, cuotas y comisiones

const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth, roles } = require('../middleware/auth');
const dayjs = require('dayjs');
const prisma = new PrismaClient();

// ── CLIENTES ──

// GET /api/ventas/clientes
router.get('/clientes', auth, async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const where = q ? {
      OR: [
        { nombre: { contains: q, mode: 'insensitive' } },
        { apellido: { contains: q, mode: 'insensitive' } },
        { ci: { contains: q } },
        { email: { contains: q, mode: 'insensitive' } }
      ]
    } : {};

    const [clientes, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        include: {
          ventas: {
            select: { id: true, precioFinal: true, estado: true },
            include: { unidad: { include: { proyecto: { select: { nombre: true } } } } }
          }
        },
        skip: (page - 1) * limit,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.cliente.count({ where })
    ]);

    res.json({ clientes, total, pagina: parseInt(page), totalPaginas: Math.ceil(total / limit) });
  } catch { res.status(500).json({ error: 'Error al obtener clientes' }); }
});

// POST /api/ventas/clientes
router.post('/clientes', auth, roles('ADMIN', 'GERENCIA', 'COMERCIAL'), async (req, res) => {
  try {
    const cliente = await prisma.cliente.create({ data: req.body });
    res.status(201).json(cliente);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'CI ya registrado' });
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

// PUT /api/ventas/clientes/:id
router.put('/clientes/:id', auth, roles('ADMIN', 'GERENCIA', 'COMERCIAL'), async (req, res) => {
  try {
    const cliente = await prisma.cliente.update({ where: { id: req.params.id }, data: req.body });
    res.json(cliente);
  } catch { res.status(500).json({ error: 'Error al actualizar cliente' }); }
});

// ── VENTAS ──

// GET /api/ventas
router.get('/', auth, async (req, res) => {
  try {
    const { proyectoId, estado, vendedorId, page = 1, limit = 20, desde, hasta } = req.query;
    const where = {};
    if (proyectoId) where.unidad = { proyectoId };
    if (estado)     where.estado = estado;
    if (vendedorId) where.vendedorId = vendedorId;
    if (desde || hasta) {
      where.fechaVenta = {};
      if (desde) where.fechaVenta.gte = new Date(desde);
      if (hasta) where.fechaVenta.lte = new Date(hasta);
    }

    const [ventas, total] = await Promise.all([
      prisma.venta.findMany({
        where,
        include: {
          cliente:  { select: { nombre: true, apellido: true, ci: true, telefono: true } },
          unidad:   { include: { proyecto: { select: { id: true, nombre: true } } } },
          vendedor: { select: { nombre: true } },
          cuotas:   { select: { id: true, pagado: true, monto: true, vencimiento: true } },
          comision: { select: { montoNeto: true, estado: true } }
        },
        skip: (page - 1) * limit,
        take: parseInt(limit),
        orderBy: { fechaVenta: 'desc' }
      }),
      prisma.venta.count({ where })
    ]);

    // Calcular saldo pendiente por venta
    const data = ventas.map(v => ({
      ...v,
      cuotasPagadas:   v.cuotas.filter(c => c.pagado).length,
      cuotasPendientes: v.cuotas.filter(c => !c.pagado).length,
      saldoPendiente:  v.cuotas.filter(c => !c.pagado).reduce((s, c) => s + c.monto, 0),
      cuotasVencidas:  v.cuotas.filter(c => !c.pagado && new Date(c.vencimiento) < new Date()).length
    }));

    res.json({ ventas: data, total, pagina: parseInt(page), totalPaginas: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
});

// GET /api/ventas/resumen — KPIs del mes
router.get('/resumen', auth, async (req, res) => {
  try {
    const { mes, anio } = req.query;
    const fecha = dayjs(`${anio || dayjs().year()}-${mes || dayjs().month() + 1}-01`);
    const inicio = fecha.startOf('month').toDate();
    const fin    = fecha.endOf('month').toDate();

    const [ventasMes, totalVendido, saldoPendiente, comisiones] = await Promise.all([
      prisma.venta.count({ where: { fechaVenta: { gte: inicio, lte: fin } } }),
      prisma.venta.aggregate({
        where: { fechaVenta: { gte: inicio, lte: fin } },
        _sum: { precioFinal: true }
      }),
      prisma.cuota.aggregate({
        where: { pagado: false },
        _sum: { monto: true }
      }),
      prisma.comision.aggregate({
        where: { createdAt: { gte: inicio, lte: fin } },
        _sum: { montoNeto: true }
      })
    ]);

    res.json({
      ventasMes,
      totalVendido:   totalVendido._sum.precioFinal || 0,
      saldoPendiente: saldoPendiente._sum.monto || 0,
      comisiones:     comisiones._sum.montoNeto || 0
    });
  } catch { res.status(500).json({ error: 'Error al obtener resumen ventas' }); }
});

// POST /api/ventas — registrar nueva venta
router.post('/', auth, roles('ADMIN', 'GERENCIA', 'COMERCIAL'), async (req, res) => {
  try {
    const {
      clienteId, unidadId, precioFinal, moneda, tipoCambio,
      totalCuotas, fechaVenta, vendedorId, observacion,
      cuotas, porcentajeComision
    } = req.body;

    // Verificar disponibilidad
    const unidad = await prisma.unidad.findUnique({ where: { id: unidadId } });
    if (!unidad || unidad.estado !== 'DISPONIBLE') {
      return res.status(409).json({ error: 'Unidad no disponible' });
    }

    // Obtener número correlativo
    const ultima = await prisma.venta.findFirst({ orderBy: { createdAt: 'desc' }, select: { numero: true } });
    const num = ultima ? parseInt(ultima.numero.split('-')[1]) + 1 : 1;
    const numero = `V-${String(num).padStart(4, '0')}`;

    // Crear venta, marcar unidad y crear cuotas en transacción
    const result = await prisma.$transaction(async (tx) => {
      const venta = await tx.venta.create({
        data: {
          numero, clienteId, unidadId,
          vendedorId: vendedorId || req.usuario.id,
          precioFinal, moneda: moneda || 'USD',
          tipoCambio: tipoCambio || 7.05,
          totalCuotas, fechaVenta: new Date(fechaVenta),
          estado: 'AL_DIA', observacion
        }
      });

      await tx.unidad.update({ where: { id: unidadId }, data: { estado: 'VENDIDO' } });

      // Crear cuotas
      if (cuotas && cuotas.length > 0) {
        await tx.cuota.createMany({
          data: cuotas.map((c, i) => ({
            ventaId: venta.id,
            numero: i + 1,
            monto: c.monto,
            vencimiento: new Date(c.vencimiento)
          }))
        });
      } else if (totalCuotas && totalCuotas > 0) {
        const montoCuota = +(precioFinal / totalCuotas).toFixed(2);
        const cuotasData = [];
        for (let i = 0; i < totalCuotas; i++) {
          const venc = dayjs(fechaVenta).add(i + 1, 'month').toDate();
          cuotasData.push({
            ventaId: venta.id,
            numero: i + 1,
            monto: i === totalCuotas - 1 ? +(precioFinal - montoCuota * (totalCuotas - 1)).toFixed(2) : montoCuota,
            vencimiento: venc
          });
        }
        await tx.cuota.createMany({ data: cuotasData });
      }

      // Crear comisión automática
      if (porcentajeComision) {
        const montoBase = precioFinal;
        const descImpuesto = montoBase * porcentajeComision / 100 * 0.13;
        const montoNeto = montoBase * porcentajeComision / 100 - descImpuesto;
        await tx.comision.create({
          data: {
            ventaId: venta.id,
            vendedorId: vendedorId || req.usuario.id,
            porcentaje: porcentajeComision,
            montoBase, descImpuesto, montoNeto,
            estado: 'PENDIENTE'
          }
        });
      }

      return venta;
    });

    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar venta' });
  }
});

// PUT /api/ventas/:id
router.put('/:id', auth, roles('ADMIN', 'GERENCIA'), async (req, res) => {
  try {
    const venta = await prisma.venta.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(venta);
  } catch { res.status(500).json({ error: 'Error al actualizar venta' }); }
});

// GET /api/ventas/:id/cuotas
router.get('/:id/cuotas', auth, async (req, res) => {
  try {
    const cuotas = await prisma.cuota.findMany({
      where: { ventaId: req.params.id },
      orderBy: { numero: 'asc' }
    });
    res.json(cuotas);
  } catch { res.status(500).json({ error: 'Error al obtener cuotas' }); }
});

// PATCH /api/ventas/cuotas/:cuotaId/pagar
router.patch('/cuotas/:cuotaId/pagar', auth, roles('ADMIN', 'GERENCIA', 'FINANZAS'), async (req, res) => {
  try {
    const { metodoPago, comprobante } = req.body;
    const cuota = await prisma.cuota.update({
      where: { id: req.params.cuotaId },
      data: { pagado: true, fechaPago: new Date(), metodoPago, comprobante }
    });

    // Registrar movimiento financiero automáticamente
    const venta = await prisma.venta.findUnique({
      where: { id: cuota.ventaId },
      include: {
        cliente: { select: { nombre: true, apellido: true } },
        unidad: { include: { proyecto: { select: { nombre: true } } } }
      }
    });

    const tc = await prisma.tipoCambioHistorico.findFirst({
      where: { periodo: dayjs().format('YYYY-MM') }
    });

    await prisma.movimientoFinanciero.create({
      data: {
        numero: `M-${Date.now()}`,
        tipo: 'INGRESO',
        concepto: `Pago cuota ${cuota.numero}/${venta.totalCuotas} — ${venta.cliente.nombre} ${venta.cliente.apellido}`,
        proyectoId: venta.unidad.proyectoId,
        categoria: 'Pago de cuota',
        monedaOrigen: 'USD',
        montoUSD: cuota.monto,
        tipoCambio: tc?.tcOficial || 7.05,
        montoBs: cuota.monto * (tc?.tcOficial || 7.05),
        metodo: metodoPago || 'Transferencia',
        referencia: comprobante,
        fecha: new Date(),
        registradoPorId: req.usuario.id
      }
    });

    res.json(cuota);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar pago' });
  }
});

module.exports = router;
