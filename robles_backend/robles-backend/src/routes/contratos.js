// routes/contratos.js — Contratos clientes y proveedores

const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth, roles } = require('../middleware/auth');
const dayjs = require('dayjs');
const prisma = new PrismaClient();

// GET /api/contratos — todos los contratos de clientes
router.get('/', auth, async (req, res) => {
  try {
    const { proyectoId, estado, page = 1, limit = 20 } = req.query;
    const where = {};
    if (proyectoId) where.proyectoId = proyectoId;
    if (estado)     where.estado     = estado;

    const [contratos, total] = await Promise.all([
      prisma.contratoCliente.findMany({
        where,
        include: {
          cliente:  { select: { nombre: true, apellido: true, ci: true } },
          proyecto: { select: { nombre: true } },
          documentos: { select: { id: true, nombre: true, estado: true } }
        },
        skip: (page - 1) * limit,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.contratoCliente.count({ where })
    ]);
    res.json({ contratos, total, pagina: parseInt(page) });
  } catch { res.status(500).json({ error: 'Error al obtener contratos' }); }
});

// POST /api/contratos
router.post('/', auth, roles('ADMIN', 'GERENCIA', 'LEGAL'), async (req, res) => {
  try {
    const ultima = await prisma.contratoCliente.findFirst({
      orderBy: { createdAt: 'desc' }, select: { numero: true }
    });
    const num    = ultima ? parseInt(ultima.numero.split('-')[1]) + 1 : 1;
    const numero = `CT-${String(num).padStart(4, '0')}`;

    const contrato = await prisma.contratoCliente.create({
      data: {
        numero,
        ...req.body,
        fechaEmision: new Date(req.body.fechaEmision),
        fechaFirma:   req.body.fechaFirma ? new Date(req.body.fechaFirma) : null
      }
    });
    res.status(201).json(contrato);
  } catch { res.status(500).json({ error: 'Error al crear contrato' }); }
});

// PATCH /api/contratos/:id/firmar
router.patch('/:id/firmar', auth, roles('ADMIN', 'GERENCIA', 'LEGAL'), async (req, res) => {
  try {
    const contrato = await prisma.contratoCliente.update({
      where: { id: req.params.id },
      data: {
        estado:     'FIRMADO',
        fechaFirma: new Date(),
        notaria:    req.body.notaria
      }
    });
    res.json(contrato);
  } catch { res.status(500).json({ error: 'Error al registrar firma' }); }
});

// ── CONTRATOS PROVEEDORES ──

// GET /api/contratos/proveedores
router.get('/proveedores', auth, async (req, res) => {
  try {
    const contratos = await prisma.contratoProveedor.findMany({
      include: {
        proveedor: { select: { nombre: true, nit: true } },
        proyecto:  { select: { nombre: true } }
      },
      orderBy: { fechaVencimiento: 'asc' }
    });

    const hoy = dayjs();
    const data = contratos.map(c => ({
      ...c,
      diasRestantes: dayjs(c.fechaVencimiento).diff(hoy, 'day'),
      alertaVencimiento: dayjs(c.fechaVencimiento).diff(hoy, 'day') <= c.diasAlerta
    }));

    res.json(data);
  } catch { res.status(500).json({ error: 'Error al obtener contratos proveedores' }); }
});

// POST /api/contratos/proveedores
router.post('/proveedores', auth, roles('ADMIN', 'GERENCIA', 'LEGAL'), async (req, res) => {
  try {
    const ultima = await prisma.contratoProveedor.findFirst({
      orderBy: { createdAt: 'desc' }, select: { numero: true }
    });
    const num    = ultima ? parseInt(ultima.numero.split('-')[1]) + 1 : 1;
    const numero = `CP-${String(num).padStart(4, '0')}`;

    const contrato = await prisma.contratoProveedor.create({
      data: {
        numero,
        ...req.body,
        fechaInicio:      new Date(req.body.fechaInicio),
        fechaVencimiento: new Date(req.body.fechaVencimiento)
      }
    });
    res.status(201).json(contrato);
  } catch { res.status(500).json({ error: 'Error al crear contrato proveedor' }); }
});

// GET /api/contratos/alertas — vencimientos próximos
router.get('/alertas', auth, async (req, res) => {
  try {
    const { dias = 30 } = req.query;
    const limite = dayjs().add(parseInt(dias), 'day').toDate();

    const [proveedores, docs] = await Promise.all([
      prisma.contratoProveedor.findMany({
        where: { fechaVencimiento: { lte: limite, gte: new Date() } },
        include: { proveedor: { select: { nombre: true } }, proyecto: { select: { nombre: true } } },
        orderBy: { fechaVencimiento: 'asc' }
      }),
      prisma.documento.findMany({
        where: { fechaVencimiento: { lte: limite, gte: new Date() } },
        orderBy: { fechaVencimiento: 'asc' }
      })
    ]);

    const alertas = [
      ...proveedores.map(c => ({
        tipo:         'CONTRATO_PROVEEDOR',
        descripcion:  `Contrato ${c.proveedor.nombre}`,
        proyecto:     c.proyecto?.nombre,
        vencimiento:  c.fechaVencimiento,
        diasRestantes: dayjs(c.fechaVencimiento).diff(dayjs(), 'day'),
        urgencia:     dayjs(c.fechaVencimiento).diff(dayjs(), 'day') <= 7 ? 'CRITICO'
                    : dayjs(c.fechaVencimiento).diff(dayjs(), 'day') <= 15 ? 'ALTO' : 'MEDIO'
      })),
      ...docs.map(d => ({
        tipo:         'DOCUMENTO',
        descripcion:  d.nombre,
        vencimiento:  d.fechaVencimiento,
        diasRestantes: dayjs(d.fechaVencimiento).diff(dayjs(), 'day'),
        urgencia:     dayjs(d.fechaVencimiento).diff(dayjs(), 'day') <= 7 ? 'CRITICO'
                    : dayjs(d.fechaVencimiento).diff(dayjs(), 'day') <= 15 ? 'ALTO' : 'MEDIO'
      }))
    ].sort((a, b) => a.diasRestantes - b.diasRestantes);

    res.json(alertas);
  } catch { res.status(500).json({ error: 'Error al obtener alertas' }); }
});

module.exports = router;
