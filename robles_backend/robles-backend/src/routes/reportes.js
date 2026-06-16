// routes/reportes.js — Generación de PDF, Excel e historial

const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth, roles } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const dayjs = require('dayjs');
const prisma = new PrismaClient();

// Helper colores corporativos
const COLORS = {
  bark:      '3B1F0A',
  bark_mid:  '6B3A18',
  leaf:      '2D5E1E',
  leaf_pale: 'DDF0CC',
  gold:      'B8872A',
  gold_bg:   'FDF4E0',
  off:       'F8F6F3',
  border:    'EDE8E0',
  white:     'FFFFFF',
  red:       'C04030',
};

// ── EXCEL HELPERS ──
function headerRow(ws, cols, rowNum = 1) {
  const row = ws.getRow(rowNum);
  cols.forEach((c, i) => {
    const cell = row.getCell(i + 1);
    cell.value = c.header;
    cell.font  = { bold: true, color: { argb: COLORS.white }, size: 10 };
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.bark } };
    cell.alignment = { horizontal: c.align || 'left', vertical: 'middle' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: COLORS.border } }
    };
    if (c.width) ws.getColumn(i + 1).width = c.width;
  });
  row.height = 22;
}

function dataRow(ws, rowNum, values, isAlt = false) {
  const row = ws.getRow(rowNum);
  values.forEach((v, i) => {
    const cell = row.getCell(i + 1);
    cell.value = v;
    cell.font = { size: 9.5 };
    if (isAlt) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.off } };
    cell.border = { bottom: { style: 'hair', color: { argb: COLORS.border } } };
  });
  row.height = 18;
}

function titleBlock(ws, titulo, subtitulo, periodo) {
  ws.mergeCells('A1:H1');
  ws.getCell('A1').value = 'ROBLES EDIFICIOS SRL';
  ws.getCell('A1').font  = { bold: true, size: 14, color: { argb: COLORS.bark } };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  ws.mergeCells('A2:H2');
  ws.getCell('A2').value = titulo;
  ws.getCell('A2').font  = { bold: true, size: 12, color: { argb: COLORS.bark_mid } };
  ws.getCell('A2').alignment = { horizontal: 'center' };

  ws.mergeCells('A3:H3');
  ws.getCell('A3').value = `${subtitulo} · ${periodo}`;
  ws.getCell('A3').font  = { size: 10, italic: true, color: { argb: '9A8272' } };
  ws.getCell('A3').alignment = { horizontal: 'center' };

  ws.getRow(1).height = 24;
  ws.getRow(2).height = 20;
  ws.getRow(3).height = 16;
  ws.addRow([]);
}

// ── VENTAS EXCEL ──
async function generarExcelVentas(ws, params) {
  const { desde, hasta } = params;
  const where = {};
  if (desde || hasta) {
    where.fechaVenta = {};
    if (desde) where.fechaVenta.gte = new Date(desde);
    if (hasta) where.fechaVenta.lte = new Date(hasta);
  }

  const ventas = await prisma.venta.findMany({
    where,
    include: {
      cliente:  { select: { nombre: true, apellido: true, ci: true } },
      unidad:   { include: { proyecto: { select: { nombre: true } } } },
      vendedor: { select: { nombre: true } },
      cuotas:   { select: { pagado: true, monto: true, vencimiento: true } }
    },
    orderBy: { fechaVenta: 'desc' }
  });

  titleBlock(ws, 'REPORTE DE VENTAS', 'Ventas registradas en el período', dayjs().format('MMMM YYYY'));

  const cols = [
    { header: '#',          width: 8  },
    { header: 'Fecha',      width: 12 },
    { header: 'Cliente',    width: 22 },
    { header: 'CI',         width: 12 },
    { header: 'Proyecto',   width: 20 },
    { header: 'Dpto.',      width: 8  },
    { header: 'Precio USD', width: 14, align: 'right' },
    { header: 'Saldo USD',  width: 14, align: 'right' },
    { header: 'Vendedor',   width: 18 },
    { header: 'Estado',     width: 12 }
  ];
  headerRow(ws, cols, 5);

  ventas.forEach((v, i) => {
    const saldo = v.cuotas.filter(c => !c.pagado).reduce((s, c) => s + c.monto, 0);
    dataRow(ws, i + 6, [
      v.numero,
      dayjs(v.fechaVenta).format('DD/MM/YYYY'),
      `${v.cliente.nombre} ${v.cliente.apellido}`,
      v.cliente.ci,
      v.unidad.proyecto.nombre,
      v.unidad.codigo,
      { value: v.precioFinal, numFmt: '$#,##0.00' },
      { value: saldo, numFmt: '$#,##0.00' },
      v.vendedor.nombre,
      v.estado
    ], i % 2 === 1);
  });

  // Totales
  const totalRow = ws.addRow([]);
  totalRow.getCell(1).value = 'TOTAL';
  totalRow.getCell(1).font  = { bold: true, size: 10 };
  totalRow.getCell(7).value = ventas.reduce((s, v) => s + v.precioFinal, 0);
  totalRow.getCell(7).numFmt = '$#,##0.00';
  totalRow.getCell(7).font   = { bold: true, color: { argb: COLORS.leaf } };
}

// ── PLANILLA EXCEL ──
async function generarExcelPlanilla(ws, params) {
  const { periodo } = params;
  const per = periodo || dayjs().format('YYYY-MM');

  const planilla = await prisma.planilla.findUnique({
    where: { periodo: per },
    include: {
      items: {
        include: { empleado: { select: { nombre: true, apellido: true, cargo: true, ci: true } } }
      }
    }
  });

  if (!planilla) {
    ws.getCell('A1').value = `No existe planilla para el período ${per}`;
    return;
  }

  titleBlock(ws, 'PLANILLA DE SUELDOS Y SALARIOS', `Período: ${per}`, `AFP 12.71% · RC-IVA 13%`);

  const cols = [
    { header: 'CI',            width: 12 },
    { header: 'Empleado',      width: 24 },
    { header: 'Cargo',         width: 20 },
    { header: 'Días Trab.',    width: 10, align: 'center' },
    { header: 'Salario Base',  width: 14, align: 'right' },
    { header: 'H. Extra',      width: 10, align: 'right' },
    { header: 'Bonificación',  width: 12, align: 'right' },
    { header: 'Desc. AFP',     width: 12, align: 'right' },
    { header: 'Desc. RC-IVA',  width: 12, align: 'right' },
    { header: 'NETO A PAGAR',  width: 14, align: 'right' }
  ];
  headerRow(ws, cols, 5);

  planilla.items.forEach((item, i) => {
    dataRow(ws, i + 6, [
      item.empleado.ci,
      `${item.empleado.nombre} ${item.empleado.apellido}`,
      item.empleado.cargo,
      item.diasTrabajados,
      { value: item.salarioBase, numFmt: '#,##0.00' },
      { value: item.montoExtra, numFmt: '#,##0.00' },
      { value: item.bonificacion, numFmt: '#,##0.00' },
      { value: item.descAfp, numFmt: '#,##0.00' },
      { value: item.descRcIva, numFmt: '#,##0.00' },
      { value: item.salarioNeto, numFmt: '#,##0.00' }
    ], i % 2 === 1);
  });

  const totalRow = ws.addRow([]);
  totalRow.getCell(2).value = 'TOTALES';
  totalRow.getCell(2).font  = { bold: true };
  [5,6,7,8,9,10].forEach(col => {
    const sums = { 5: planilla.totalBruto, 8: planilla.totalAfp, 9: planilla.totalRcIva, 10: planilla.totalNeto };
    if (sums[col] !== undefined) {
      totalRow.getCell(col).value  = sums[col];
      totalRow.getCell(col).numFmt = '#,##0.00';
      totalRow.getCell(col).font   = { bold: true, color: { argb: COLORS.leaf } };
    }
  });
}

// ── ENDPOINTS ──

// GET /api/reportes/excel/ventas
router.get('/excel/ventas', auth, async (req, res) => {
  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Robles Edificios ERP';
    wb.created = new Date();

    const ws = wb.addWorksheet('Ventas', { pageSetup: { orientation: 'landscape' } });
    await generarExcelVentas(ws, req.query);

    const nombre = `Ventas_${dayjs().format('YYYY-MM')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    await wb.xlsx.write(res);

    // Registrar en historial
    await prisma.reporteHistorial.create({
      data: { nombre, modulo: 'Ventas', formato: 'EXCEL', generadoPorId: req.usuario.id }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar Excel de ventas' });
  }
});

// GET /api/reportes/excel/planilla
router.get('/excel/planilla', auth, roles('ADMIN', 'GERENCIA', 'RRHH', 'FINANZAS'), async (req, res) => {
  try {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Planilla');
    await generarExcelPlanilla(ws, req.query);

    const periodo = req.query.periodo || dayjs().format('YYYY-MM');
    const nombre  = `Planilla_RRHH_${periodo}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    await wb.xlsx.write(res);

    await prisma.reporteHistorial.create({
      data: { nombre, modulo: 'RRHH', formato: 'EXCEL', generadoPorId: req.usuario.id }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar planilla Excel' });
  }
});

// GET /api/reportes/excel/gastos
router.get('/excel/gastos', auth, async (req, res) => {
  try {
    const { proyectoId, desde, hasta } = req.query;
    const where = {};
    if (proyectoId) where.proyectoId = proyectoId;
    if (desde) where.fecha = { gte: new Date(desde) };
    if (hasta) where.fecha = { ...(where.fecha || {}), lte: new Date(hasta) };

    const gastos = await prisma.gasto.findMany({
      where,
      include: {
        proyecto:      { select: { nombre: true } },
        registradoPor: { select: { nombre: true } }
      },
      orderBy: { fecha: 'desc' }
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Gastos');
    titleBlock(ws, 'CONTROL DE GASTOS Y COSTOS', 'Todos los proyectos', dayjs().format('MMMM YYYY'));

    const cols = [
      { header: '#',           width: 10 },
      { header: 'Fecha',       width: 12 },
      { header: 'Descripción', width: 30 },
      { header: 'Proyecto',    width: 20 },
      { header: 'Categoría',   width: 16 },
      { header: 'Tipo',        width: 10 },
      { header: 'USD',         width: 12, align: 'right' },
      { header: 'TC',          width: 8,  align: 'right' },
      { header: 'Bs',          width: 14, align: 'right' },
      { header: 'Registrado',  width: 18 }
    ];
    headerRow(ws, cols, 5);
    gastos.forEach((g, i) => {
      dataRow(ws, i + 6, [
        g.numero,
        dayjs(g.fecha).format('DD/MM/YYYY'),
        g.descripcion,
        g.proyecto.nombre,
        g.categoria,
        g.tipo,
        { value: g.montoUSD, numFmt: '$#,##0.00' },
        { value: g.tipoCambio, numFmt: '0.00' },
        { value: g.montoBs, numFmt: '#,##0.00' },
        g.registradoPor.nombre
      ], i % 2 === 1);
    });

    const nombre = `Gastos_${dayjs().format('YYYY-MM')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    await wb.xlsx.write(res);

    await prisma.reporteHistorial.create({
      data: { nombre, modulo: 'Costos', formato: 'EXCEL', generadoPorId: req.usuario.id }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar Excel de gastos' });
  }
});

// GET /api/reportes/historial
router.get('/historial', auth, async (req, res) => {
  try {
    const historial = await prisma.reporteHistorial.findMany({
      include: { generadoPor: { select: { nombre: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(historial);
  } catch { res.status(500).json({ error: 'Error al obtener historial' }); }
});

// GET /api/reportes/programados
router.get('/programados', auth, async (req, res) => {
  try {
    const programados = await prisma.reporteProgramado.findMany({
      orderBy: { proximaEjecucion: 'asc' }
    });
    res.json(programados);
  } catch { res.status(500).json({ error: 'Error al obtener reportes programados' }); }
});

// POST /api/reportes/programados
router.post('/programados', auth, roles('ADMIN', 'GERENCIA'), async (req, res) => {
  try {
    const { nombre, tipo, frecuencia, diaSemana, diaMes, hora, emails, formato } = req.body;

    // Calcular próxima ejecución
    let proxima = dayjs();
    if (frecuencia === 'DIARIO') proxima = proxima.add(1, 'day').startOf('day').add(parseInt(hora.split(':')[0]), 'hour');
    else if (frecuencia === 'SEMANAL') proxima = proxima.day(diaSemana).add(1, 'week');
    else if (frecuencia === 'MENSUAL') proxima = proxima.date(diaMes).add(1, 'month');

    const reporte = await prisma.reporteProgramado.create({
      data: { nombre, tipo, frecuencia, diaSemana, diaMes, hora, emails, formato: formato || 'PDF', proximaEjecucion: proxima.toDate() }
    });
    res.status(201).json(reporte);
  } catch { res.status(500).json({ error: 'Error al crear reporte programado' }); }
});

// PATCH /api/reportes/programados/:id
router.patch('/programados/:id', auth, roles('ADMIN', 'GERENCIA'), async (req, res) => {
  try {
    const reporte = await prisma.reporteProgramado.update({
      where: { id: req.params.id }, data: req.body
    });
    res.json(reporte);
  } catch { res.status(500).json({ error: 'Error al actualizar reporte programado' }); }
});

module.exports = router;
