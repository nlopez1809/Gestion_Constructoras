// routes/documentos.js — Gestión de documentos digitales (Legal)

const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth, roles } = require('../middleware/auth');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const prisma = new PrismaClient();

// Multer en memoria (luego se sube a S3/R2)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg', 'image/png'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo de archivo no permitido'));
  }
});

// Helper para subir a S3/R2 (configurar con AWS SDK o @aws-sdk/client-s3)
async function subirArchivoStorage(buffer, filename, mimetype) {
  // En producción: usar AWS SDK o @aws-sdk/client-s3
  // const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  // const s3 = new S3Client({ region: process.env.S3_REGION, endpoint: process.env.S3_ENDPOINT,
  //   credentials: { accessKeyId: process.env.S3_ACCESS_KEY, secretAccessKey: process.env.S3_SECRET_KEY }});
  // await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: filename, Body: buffer, ContentType: mimetype }));
  // return `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${filename}`;

  // Placeholder para desarrollo:
  return `/storage/${filename}`;
}

// GET /api/documentos
router.get('/', auth, async (req, res) => {
  try {
    const { proyectoId, categoria, estado, q } = req.query;
    const where = {};
    if (proyectoId) where.proyectoId = proyectoId;
    if (categoria)  where.categoria  = categoria;
    if (estado)     where.estado     = estado;
    if (q) where.nombre = { contains: q, mode: 'insensitive' };

    const docs = await prisma.documento.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    const hoy = dayjs();
    const data = docs.map(d => ({
      ...d,
      diasRestantes: d.fechaVencimiento
        ? dayjs(d.fechaVencimiento).diff(hoy, 'day') : null,
      alertaVencimiento: d.fechaVencimiento
        ? dayjs(d.fechaVencimiento).diff(hoy, 'day') <= 30 : false
    }));

    res.json(data);
  } catch { res.status(500).json({ error: 'Error al obtener documentos' }); }
});

// POST /api/documentos — subir nuevo documento
router.post('/', auth, upload.single('archivo'), async (req, res) => {
  try {
    const { nombre, categoria, proyectoId, contratoClienteId,
            contratoProvId, fechaVencimiento, estado } = req.body;

    let urlArchivo = null;
    let tamanoKb   = null;

    if (req.file) {
      const ext      = req.file.originalname.split('.').pop();
      const filename = `${uuidv4()}.${ext}`;
      urlArchivo     = await subirArchivoStorage(req.file.buffer, filename, req.file.mimetype);
      tamanoKb       = Math.round(req.file.size / 1024);
    }

    const doc = await prisma.documento.create({
      data: {
        nombre,
        categoria,
        proyectoId:        proyectoId || null,
        contratoClienteId: contratoClienteId || null,
        contratoProvId:    contratoProvId || null,
        urlArchivo:        urlArchivo || req.body.urlArchivo,
        tamanoKb,
        fechaVencimiento:  fechaVencimiento ? new Date(fechaVencimiento) : null,
        estado:            estado || 'VIGENTE',
        subidoPor:         req.usuario.nombre
      }
    });
    res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al subir documento' });
  }
});

// PATCH /api/documentos/:id
router.patch('/:id', auth, roles('ADMIN', 'GERENCIA', 'LEGAL'), async (req, res) => {
  try {
    const doc = await prisma.documento.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        fechaVencimiento: req.body.fechaVencimiento
          ? new Date(req.body.fechaVencimiento) : undefined
      }
    });
    res.json(doc);
  } catch { res.status(500).json({ error: 'Error al actualizar documento' }); }
});

// DELETE /api/documentos/:id
router.delete('/:id', auth, roles('ADMIN', 'GERENCIA', 'LEGAL'), async (req, res) => {
  try {
    await prisma.documento.delete({ where: { id: req.params.id } });
    res.json({ mensaje: 'Documento eliminado' });
  } catch { res.status(500).json({ error: 'Error al eliminar documento' }); }
});

// GET /api/documentos/vencimientos — próximos 60 días
router.get('/vencimientos', auth, async (req, res) => {
  try {
    const { dias = 60 } = req.query;
    const limite = dayjs().add(parseInt(dias), 'day').toDate();
    const docs = await prisma.documento.findMany({
      where: { fechaVencimiento: { lte: limite, gte: new Date() } },
      orderBy: { fechaVencimiento: 'asc' }
    });
    res.json(docs.map(d => ({
      ...d,
      diasRestantes: dayjs(d.fechaVencimiento).diff(dayjs(), 'day'),
      urgencia: dayjs(d.fechaVencimiento).diff(dayjs(), 'day') <= 7  ? 'CRITICO'
              : dayjs(d.fechaVencimiento).diff(dayjs(), 'day') <= 15 ? 'ALTO' : 'MEDIO'
    })));
  } catch { res.status(500).json({ error: 'Error al obtener vencimientos' }); }
});

module.exports = router;
