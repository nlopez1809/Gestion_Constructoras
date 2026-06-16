// routes/empleados.js — Empleados, asistencia y planilla

const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth, roles } = require('../middleware/auth');
const dayjs = require('dayjs');
const prisma = new PrismaClient();

const AFP_PCT   = 0.1271; // 12.71%
const RC_IVA_PCT = 0.13;  // 13%

// ── EMPLEADOS ──

// GET /api/empleados
router.get('/', auth, async (req, res) => {
  try {
    const { proyectoId, estado, q } = req.query;
    const where = {};
    if (proyectoId) where.proyectoId = proyectoId;
    if (estado)     where.estado = estado;
    if (q) where.OR = [
      { nombre: { contains: q, mode: 'insensitive' } },
      { apellido: { contains: q, mode: 'insensitive' } },
      { ci: { contains: q } },
      { cargo: { contains: q, mode: 'insensitive' } }
    ];

    const empleados = await prisma.empleado.findMany({
      where,
      orderBy: { nombre: 'asc' }
    });
    res.json(empleados);
  } catch { res.status(500).json({ error: 'Error al obtener empleados' }); }
});

// GET /api/empleados/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const empleado = await prisma.empleado.findUnique({
      where: { id: req.params.id },
      include: {
        asistencias: { orderBy: { fecha: 'desc' }, take: 30 },
        historial:   { orderBy: { fecha: 'desc' } },
        comisiones:  { orderBy: { periodo: 'desc' }, take: 6 }
      }
    });
    if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(empleado);
  } catch { res.status(500).json({ error: 'Error al obtener empleado' }); }
});

// POST /api/empleados
router.post('/', auth, roles('ADMIN', 'GERENCIA', 'RRHH'), async (req, res) => {
  try {
    const empleado = await prisma.empleado.create({
      data: {
        ...req.body,
        fechaIngreso: new Date(req.body.fechaIngreso)
      }
    });

    // Registrar historial
    await prisma.historialLaboral.create({
      data: {
        empleadoId:  empleado.id,
        tipo:        'INGRESO',
        descripcion: `Ingreso a Robles Edificios · Cargo: ${empleado.cargo}`,
        valorNuevo:  empleado.salarioBase,
        fecha:       empleado.fechaIngreso
      }
    });

    res.status(201).json(empleado);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'CI ya registrado' });
    res.status(500).json({ error: 'Error al crear empleado' });
  }
});

// PUT /api/empleados/:id
router.put('/:id', auth, roles('ADMIN', 'GERENCIA', 'RRHH'), async (req, res) => {
  try {
    const anterior = await prisma.empleado.findUnique({ where: { id: req.params.id } });
    const empleado = await prisma.empleado.update({
      where: { id: req.params.id },
      data: req.body
    });

    // Si hubo cambio de salario, registrar en historial
    if (req.body.salarioBase && req.body.salarioBase !== anterior.salarioBase) {
      await prisma.historialLaboral.create({
        data: {
          empleadoId:  empleado.id,
          tipo:        'AUMENTO',
          descripcion: 'Ajuste salarial',
          valorAnterior: anterior.salarioBase,
          valorNuevo:    empleado.salarioBase,
          fecha:         new Date()
        }
      });
    }

    res.json(empleado);
  } catch { res.status(500).json({ error: 'Error al actualizar empleado' }); }
});

// ── ASISTENCIA ──

// GET /api/empleados/asistencia/semana
router.get('/asistencia/semana', auth, async (req, res) => {
  try {
    const { proyectoId, semana } = req.query;
    const inicio = semana ? dayjs(semana).startOf('week') : dayjs().startOf('week');
    const dias = Array.from({ length: 7 }, (_, i) => inicio.add(i, 'day'));

    const where = {};
    if (proyectoId) where.proyectoId = proyectoId;

    const empleados = await prisma.empleado.findMany({
      where: { ...where, estado: { in: ['ACTIVO', 'LICENCIA', 'VACACION'] } },
      select: { id: true, nombre: true, apellido: true, cargo: true }
    });

    const resultado = await Promise.all(empleados.map(async (emp) => {
      const asistencias = await prisma.asistencia.findMany({
        where: {
          empleadoId: emp.id,
          fecha: { gte: dias[0].toDate(), lte: dias[6].toDate() }
        }
      });

      return {
        empleado: emp,
        dias: dias.map(dia => {
          const reg = asistencias.find(a => dayjs(a.fecha).isSame(dia, 'day'));
          return { fecha: dia.toDate(), estado: reg?.estado || null };
        })
      };
    }));

    res.json({ semanaInicio: dias[0].toDate(), dias: dias.map(d => d.toDate()), registros: resultado });
  } catch { res.status(500).json({ error: 'Error al obtener asistencia' }); }
});

// POST /api/empleados/asistencia — registrar asistencia masiva
router.post('/asistencia', auth, roles('ADMIN', 'GERENCIA', 'RRHH', 'OBRA'), async (req, res) => {
  try {
    const { registros } = req.body; // [{ empleadoId, fecha, estado, observacion }]
    const result = await prisma.$transaction(
      registros.map(r =>
        prisma.asistencia.upsert({
          where: { empleadoId_fecha: { empleadoId: r.empleadoId, fecha: new Date(r.fecha) } },
          create: { ...r, fecha: new Date(r.fecha) },
          update: { estado: r.estado, observacion: r.observacion }
        })
      )
    );
    res.json({ registrados: result.length });
  } catch { res.status(500).json({ error: 'Error al registrar asistencia' }); }
});

// ── PLANILLA ──

// GET /api/empleados/planilla/lista
router.get('/planilla/lista', auth, roles('ADMIN', 'GERENCIA', 'RRHH', 'FINANZAS'), async (req, res) => {
  try {
    const planillas = await prisma.planilla.findMany({
      orderBy: { periodo: 'desc' },
      take: 12
    });
    res.json(planillas);
  } catch { res.status(500).json({ error: 'Error al obtener planillas' }); }
});

// POST /api/empleados/planilla/generar — genera planilla del mes
router.post('/planilla/generar', auth, roles('ADMIN', 'GERENCIA', 'RRHH'), async (req, res) => {
  try {
    const { periodo } = req.body; // "2026-05"
    const mes = dayjs(periodo + '-01');
    const inicio = mes.startOf('month').toDate();
    const fin    = mes.endOf('month').toDate();
    const diasHabiles = 26; // días laborales del mes

    // Verificar si ya existe
    const existe = await prisma.planilla.findUnique({ where: { periodo } });
    if (existe) return res.status(409).json({ error: `Ya existe planilla para ${periodo}` });

    const empleados = await prisma.empleado.findMany({
      where: { estado: { in: ['ACTIVO', 'LICENCIA'] } }
    });

    const items = await Promise.all(empleados.map(async (emp) => {
      const asistencias = await prisma.asistencia.count({
        where: { empleadoId: emp.id, estado: 'PRESENTE', fecha: { gte: inicio, lte: fin } }
      });

      const diasTrab     = asistencias;
      const prorrateo    = emp.salarioBase / diasHabiles;
      const salarioReal  = prorrateo * diasTrab;
      const descAfp      = salarioReal * AFP_PCT;
      const descRcIva    = Math.max(0, salarioReal - descAfp - 2000) * RC_IVA_PCT; // mínimo no imponible
      const salarioNeto  = salarioReal - descAfp - descRcIva;

      return {
        empleadoId: emp.id,
        diasTrabajados: diasTrab,
        salarioBase: salarioReal,
        horasExtra: 0,
        montoExtra: 0,
        bonificacion: 0,
        descAfp,
        descRcIva,
        salarioNeto
      };
    }));

    const totalBruto = items.reduce((s, i) => s + i.salarioBase, 0);
    const totalAfp   = items.reduce((s, i) => s + i.descAfp, 0);
    const totalRcIva = items.reduce((s, i) => s + i.descRcIva, 0);
    const totalNeto  = items.reduce((s, i) => s + i.salarioNeto, 0);

    const planilla = await prisma.$transaction(async (tx) => {
      const p = await tx.planilla.create({
        data: { periodo, totalBruto, totalAfp, totalRcIva, totalNeto }
      });
      await tx.planillaItem.createMany({
        data: items.map(i => ({ ...i, planillaId: p.id }))
      });
      return p;
    });

    const planillaCompleta = await prisma.planilla.findUnique({
      where: { id: planilla.id },
      include: { items: { include: { empleado: { select: { nombre: true, apellido: true, cargo: true } } } } }
    });

    res.status(201).json(planillaCompleta);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar planilla' });
  }
});

// PATCH /api/empleados/planilla/:id/aprobar
router.patch('/planilla/:id/aprobar', auth, roles('ADMIN', 'GERENCIA'), async (req, res) => {
  try {
    const planilla = await prisma.planilla.update({
      where: { id: req.params.id },
      data: { estado: 'APROBADA', aprobadoEn: new Date() }
    });
    res.json(planilla);
  } catch { res.status(500).json({ error: 'Error al aprobar planilla' }); }
});

module.exports = router;
