// routes/ordenes.js — Órdenes de compra, proveedores e inventario

const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth, roles } = require('../middleware/auth');
const prisma = new PrismaClient();

const IVA_PCT = 0.13;

// ── PROVEEDORES ──

// GET /api/ordenes/proveedores
router.get('/proveedores', auth, async (req, res) => {
  try {
    const { q, categoria } = req.query;
    const where = { activo: true };
    if (categoria) where.categoria = categoria;
    if (q) where.OR = [
      { nombre: { contains: q, mode: 'insensitive' } },
      { nit: { contains: q } }
    ];
    const proveedores = await prisma.proveedor.findMany({
      where,
      include: {
        _count: { select: { ordenes: true } },
        ordenes: {
          select: { total: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { rating: 'desc' }
    });
    res.json(proveedores);
  } catch { res.status(500).json({ error: 'Error al obtener proveedores' }); }
});

// POST /api/ordenes/proveedores
router.post('/proveedores', auth, roles('ADMIN', 'GERENCIA', 'OBRA'), async (req, res) => {
  try {
    const proveedor = await prisma.proveedor.create({ data: req.body });
    res.status(201).json(proveedor);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'NIT ya registrado' });
    res.status(500).json({ error: 'Error al crear proveedor' });
  }
});

// PUT /api/ordenes/proveedores/:id
router.put('/proveedores/:id', auth, roles('ADMIN', 'GERENCIA', 'OBRA'), async (req, res) => {
  try {
    const proveedor = await prisma.proveedor.update({
      where: { id: req.params.id }, data: req.body
    });
    res.json(proveedor);
  } catch { res.status(500).json({ error: 'Error al actualizar proveedor' }); }
});

// ── ÓRDENES DE COMPRA ──

// GET /api/ordenes
router.get('/', auth, async (req, res) => {
  try {
    const { proyectoId, proveedorId, estado, page = 1, limit = 20 } = req.query;
    const where = {};
    if (proyectoId)  where.proyectoId  = proyectoId;
    if (proveedorId) where.proveedorId = proveedorId;
    if (estado)      where.estado      = estado;

    const [ordenes, total] = await Promise.all([
      prisma.ordenCompra.findMany({
        where,
        include: {
          proveedor: { select: { nombre: true, nit: true } },
          proyecto:  { select: { nombre: true } },
          items:     true
        },
        skip:  (page - 1) * limit,
        take:  parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.ordenCompra.count({ where })
    ]);

    res.json({ ordenes, total, pagina: parseInt(page) });
  } catch { res.status(500).json({ error: 'Error al obtener órdenes' }); }
});

// GET /api/ordenes/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const orden = await prisma.ordenCompra.findUnique({
      where: { id: req.params.id },
      include: {
        proveedor: true,
        proyecto:  { select: { nombre: true } },
        items:     true
      }
    });
    if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });
    res.json(orden);
  } catch { res.status(500).json({ error: 'Error al obtener orden' }); }
});

// POST /api/ordenes
router.post('/', auth, roles('ADMIN', 'GERENCIA', 'OBRA'), async (req, res) => {
  try {
    const { proyectoId, proveedorId, items, moneda, tipoCambio, fechaEntrega, observacion } = req.body;

    const subtotal = items.reduce((s, i) => s + i.cantidad * i.precioUnit, 0);
    const iva      = subtotal * IVA_PCT;
    const total    = subtotal + iva;

    const ultima = await prisma.ordenCompra.findFirst({
      orderBy: { createdAt: 'desc' }, select: { numero: true }
    });
    const num    = ultima ? parseInt(ultima.numero.split('-')[1]) + 1 : 1;
    const numero = `OC-${String(num).padStart(4, '0')}`;

    const orden = await prisma.$transaction(async (tx) => {
      const oc = await tx.ordenCompra.create({
        data: {
          numero, proyectoId, proveedorId,
          subtotal, iva, total,
          moneda: moneda || 'USD',
          tipoCambio: tipoCambio || 7.05,
          fechaEmision: new Date(),
          fechaEntrega: fechaEntrega ? new Date(fechaEntrega) : null,
          observacion,
          estado: 'SOLICITADA'
        }
      });
      await tx.itemOC.createMany({
        data: items.map(i => ({
          ordenId: oc.id,
          descripcion: i.descripcion,
          unidad:      i.unidad,
          cantidad:    i.cantidad,
          precioUnit:  i.precioUnit,
          total:       i.cantidad * i.precioUnit
        }))
      });
      return oc;
    });

    const completa = await prisma.ordenCompra.findUnique({
      where: { id: orden.id },
      include: { items: true, proveedor: { select: { nombre: true } } }
    });
    res.status(201).json(completa);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear orden de compra' });
  }
});

// PATCH /api/ordenes/:id/estado
router.patch('/:id/estado', auth, roles('ADMIN', 'GERENCIA', 'OBRA'), async (req, res) => {
  try {
    const { estado } = req.body;
    const estados = ['SOLICITADA','APROBADA','EMITIDA','EN_TRANSITO','RECIBIDA','PAGADA','CANCELADA'];
    if (!estados.includes(estado)) return res.status(400).json({ error: 'Estado inválido' });

    const orden = await prisma.ordenCompra.update({
      where: { id: req.params.id }, data: { estado }
    });

    // Si se recibe la OC → actualizar inventario automáticamente
    if (estado === 'RECIBIDA') {
      const items = await prisma.itemOC.findMany({ where: { ordenId: req.params.id } });
      for (const item of items) {
        const mat = await prisma.material.findFirst({
          where: { nombre: { contains: item.descripcion, mode: 'insensitive' } }
        });
        if (mat) {
          await prisma.$transaction([
            prisma.material.update({
              where: { id: mat.id },
              data: { stockActual: { increment: item.cantidad } }
            }),
            prisma.movimientoInventario.create({
              data: {
                materialId: mat.id,
                tipo: 'ENTRADA',
                cantidad: item.cantidad,
                referencia: orden.numero,
                fecha: new Date()
              }
            })
          ]);
        }
      }
    }

    res.json(orden);
  } catch { res.status(500).json({ error: 'Error al actualizar estado' }); }
});

// ── INVENTARIO ──

// GET /api/ordenes/inventario/materiales
router.get('/inventario/materiales', auth, async (req, res) => {
  try {
    const { categoria, bajoMinimo } = req.query;
    const where = {};
    if (categoria) where.categoria = categoria;
    if (bajoMinimo === 'true') where.stockActual = { lte: prisma.material.fields.stockMinimo };

    const materiales = await prisma.material.findMany({
      where,
      include: {
        movimientos: { orderBy: { fecha: 'desc' }, take: 5 }
      },
      orderBy: { nombre: 'asc' }
    });

    const data = materiales.map(m => ({
      ...m,
      alertaNivel: m.stockActual <= 0 ? 'CRITICO'
                 : m.stockActual <= m.stockMinimo ? 'BAJO'
                 : m.stockActual <= m.stockMinimo * 1.5 ? 'ATENCION'
                 : 'OK',
      pctStock: m.stockMinimo > 0 ? Math.min((m.stockActual / (m.stockMinimo * 3)) * 100, 100) : 100
    }));

    res.json(data);
  } catch { res.status(500).json({ error: 'Error al obtener inventario' }); }
});

// POST /api/ordenes/inventario/materiales
router.post('/inventario/materiales', auth, roles('ADMIN', 'GERENCIA', 'OBRA'), async (req, res) => {
  try {
    const material = await prisma.material.create({ data: req.body });
    res.status(201).json(material);
  } catch { res.status(500).json({ error: 'Error al crear material' }); }
});

// POST /api/ordenes/inventario/movimiento — entrada o salida manual
router.post('/inventario/movimiento', auth, roles('ADMIN', 'GERENCIA', 'OBRA'), async (req, res) => {
  try {
    const { materialId, tipo, cantidad, referencia, observacion } = req.body;
    const delta = tipo === 'ENTRADA' ? cantidad : -cantidad;

    const [mov] = await prisma.$transaction([
      prisma.movimientoInventario.create({
        data: { materialId, tipo, cantidad, referencia, observacion, fecha: new Date() }
      }),
      prisma.material.update({
        where: { id: materialId },
        data: { stockActual: { increment: delta } }
      })
    ]);
    res.status(201).json(mov);
  } catch { res.status(500).json({ error: 'Error al registrar movimiento' }); }
});

module.exports = router;
