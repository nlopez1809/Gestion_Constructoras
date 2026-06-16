// routes/asistencia.js
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth, roles } = require('../middleware/auth');
const dayjs = require('dayjs');
const prisma = new PrismaClient();

// GET /api/asistencia?empleadoId=&desde=&hasta=
router.get('/', auth, async (req, res) => {
  try {
    const { empleadoId, desde, hasta } = req.query;
    const where = {};
    if (empleadoId) where.empleadoId = empleadoId;
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha.gte = new Date(desde);
      if (hasta) where.fecha.lte = new Date(hasta);
    }
    const asistencias = await prisma.asistencia.findMany({
      where,
      include: { empleado: { select: { nombre: true, apellido: true, cargo: true } } },
      orderBy: { fecha: 'desc' }
    });
    res.json(asistencias);
  } catch { res.status(500).json({ error: 'Error al obtener asistencias' }); }
});

// POST /api/asistencia — registrar un día
router.post('/', auth, roles('ADMIN','GERENCIA','RRHH','OBRA'), async (req, res) => {
  try {
    const { empleadoId, fecha, estado, observacion } = req.body;
    const reg = await prisma.asistencia.upsert({
      where: { empleadoId_fecha: { empleadoId, fecha: new Date(fecha) } },
      create: { empleadoId, fecha: new Date(fecha), estado, observacion },
      update: { estado, observacion }
    });
    res.status(201).json(reg);
  } catch { res.status(500).json({ error: 'Error al registrar asistencia' }); }
});

// GET /api/asistencia/resumen-mes?periodo=2026-05
router.get('/resumen-mes', auth, async (req, res) => {
  try {
    const { periodo } = req.query;
    const mes    = dayjs((periodo || dayjs().format('YYYY-MM')) + '-01');
    const inicio = mes.startOf('month').toDate();
    const fin    = mes.endOf('month').toDate();

    const empleados = await prisma.empleado.findMany({
      where: { estado: { in: ['ACTIVO','LICENCIA','VACACION'] } },
      select: { id: true, nombre: true, apellido: true, cargo: true }
    });

    const resultado = await Promise.all(empleados.map(async (emp) => {
      const regs = await prisma.asistencia.findMany({
        where: { empleadoId: emp.id, fecha: { gte: inicio, lte: fin } }
      });
      const presentes  = regs.filter(r => r.estado === 'PRESENTE').length;
      const faltas     = regs.filter(r => r.estado === 'FALTA').length;
      const licencias  = regs.filter(r => r.estado === 'LICENCIA').length;
      const vacaciones = regs.filter(r => r.estado === 'VACACION').length;
      const diasHab    = 26;
      return {
        empleado: emp,
        presentes, faltas, licencias, vacaciones,
        pctAsistencia: diasHab > 0 ? Math.round((presentes / diasHab) * 100) : 0,
        estado: faltas > 3 ? 'IRREGULAR' : presentes >= diasHab * 0.9 ? 'BUENO' : 'REGULAR'
      };
    }));

    res.json(resultado);
  } catch { res.status(500).json({ error: 'Error al calcular resumen asistencia' }); }
});

module.exports = router;
