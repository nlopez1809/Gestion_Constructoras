// scripts/seed.js — Datos iniciales para Robles Edificios
// Ejecutar: node scripts/seed.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de Robles Edificios...\n');

  // ── USUARIOS ──
  const hash = await bcrypt.hash('Robles2026!', 12);

  const usuarios = await prisma.$transaction([
    prisma.usuario.upsert({ where: { email: 'gerencia@robles.com.bo' },
      update: {}, create: { nombre: 'Gerencia', email: 'gerencia@robles.com.bo', password: hash, rol: 'ADMIN' } }),
    prisma.usuario.upsert({ where: { email: 'finanzas@robles.com.bo' },
      update: {}, create: { nombre: 'Carlos Finanzas', email: 'finanzas@robles.com.bo', password: hash, rol: 'FINANZAS' } }),
    prisma.usuario.upsert({ where: { email: 'luis.mamani@robles.com.bo' },
      update: {}, create: { nombre: 'Luis Mamani', email: 'luis.mamani@robles.com.bo', password: hash, rol: 'COMERCIAL' } }),
    prisma.usuario.upsert({ where: { email: 'ana.rios@robles.com.bo' },
      update: {}, create: { nombre: 'Ana Ríos', email: 'ana.rios@robles.com.bo', password: hash, rol: 'COMERCIAL' } }),
    prisma.usuario.upsert({ where: { email: 'rrhh@robles.com.bo' },
      update: {}, create: { nombre: 'RRHH', email: 'rrhh@robles.com.bo', password: hash, rol: 'RRHH' } }),
  ]);
  console.log(`✅ ${usuarios.length} usuarios creados`);

  // ── TIPO DE CAMBIO ──
  await prisma.tipoCambioHistorico.upsert({
    where: { periodo: '2026-05' },
    update: {}, create: { periodo: '2026-05', tcOficial: 7.05, tcParalelo: 7.08, fuente: 'BCB' }
  });
  await prisma.tipoCambioHistorico.upsert({
    where: { periodo: '2026-04' },
    update: {}, create: { periodo: '2026-04', tcOficial: 7.05, tcParalelo: 7.10, fuente: 'BCB' }
  });
  console.log('✅ Tipos de cambio registrados');

  // ── PROYECTOS ──
  const tr1 = await prisma.proyecto.upsert({ where: { codigo: 'TR1' }, update: {}, create: {
    codigo: 'TR1', nombre: 'Torre Roble I',
    ubicacion: 'Av. América Este 1234', ciudad: 'Cochabamba',
    totalUnidades: 24, totalM2: 2112, presupuesto: 2400000,
    fechaInicio: new Date('2025-01-10'), fechaEntrega: new Date('2026-12-31'),
    estado: 'EN_OBRA', avancePct: 74
  }});
  const tr2 = await prisma.proyecto.upsert({ where: { codigo: 'TR2' }, update: {}, create: {
    codigo: 'TR2', nombre: 'Torre Roble II',
    ubicacion: 'Av. Blanco Galindo km 4', ciudad: 'Quillacollo',
    totalUnidades: 28, totalM2: 2660, presupuesto: 3100000,
    fechaInicio: new Date('2025-06-01'), fechaEntrega: new Date('2027-06-30'),
    estado: 'EN_OBRA', avancePct: 48
  }});
  const rc = await prisma.proyecto.upsert({ where: { codigo: 'RC' }, update: {}, create: {
    codigo: 'RC', nombre: 'Residencial Ceibo',
    ubicacion: 'Zona Norte Cala Cala', ciudad: 'Cochabamba',
    totalUnidades: 20, totalM2: 1300, presupuesto: 1800000,
    fechaInicio: new Date('2024-08-01'), fechaEntrega: new Date('2026-08-31'),
    estado: 'EN_OBRA', avancePct: 91
  }});
  const jn = await prisma.proyecto.upsert({ where: { codigo: 'JN' }, update: {}, create: {
    codigo: 'JN', nombre: 'Jardines del Norte',
    ubicacion: 'Colcapirhua sector industrial', ciudad: 'Colcapirhua',
    totalUnidades: 24, totalM2: 1920, presupuesto: 1500000,
    fechaInicio: new Date('2026-04-01'), fechaEntrega: new Date('2028-03-31'),
    estado: 'EN_PLANIFICACION', avancePct: 12
  }});
  console.log('✅ 4 proyectos creados');

  // ── ETAPAS TORRE ROBLE I ──
  const etapasTR1 = [
    { nombre: 'Excavación y cimentación', orden: 1, avancePct: 100, estado: 'COMPLETADA', fechaInicio: new Date('2025-01-15'), fechaFin: new Date('2025-03-30') },
    { nombre: 'Estructura y columnas',    orden: 2, avancePct: 100, estado: 'COMPLETADA', fechaInicio: new Date('2025-04-01'), fechaFin: new Date('2025-07-31') },
    { nombre: 'Mampostería y muros',       orden: 3, avancePct: 100, estado: 'COMPLETADA', fechaInicio: new Date('2025-08-01'), fechaFin: new Date('2025-11-30') },
    { nombre: 'Instalaciones eléctricas', orden: 4, avancePct: 85,  estado: 'EN_CURSO',   fechaInicio: new Date('2025-12-01') },
    { nombre: 'Instalaciones sanitarias', orden: 5, avancePct: 70,  estado: 'EN_CURSO',   fechaInicio: new Date('2026-01-15') },
    { nombre: 'Acabados y pintura',        orden: 6, avancePct: 20,  estado: 'EN_CURSO',   fechaInicio: new Date('2026-04-01') },
  ];
  for (const e of etapasTR1) {
    await prisma.etapaObra.upsert({
      where: { id: `tr1-etapa-${e.orden}` },
      update: {},
      create: { id: `tr1-etapa-${e.orden}`, proyectoId: tr1.id, ...e }
    }).catch(() => prisma.etapaObra.create({ data: { proyectoId: tr1.id, ...e } }));
  }
  console.log('✅ Etapas de obra creadas');

  // ── PRESUPUESTO ITEMS ──
  const presupItems = [
    { proyectoId: tr1.id, categoria: 'Materiales',    montoUSD: 960000 },
    { proyectoId: tr1.id, categoria: 'Mano de obra',  montoUSD: 720000 },
    { proyectoId: tr1.id, categoria: 'Equipamiento',  montoUSD: 480000 },
    { proyectoId: tr1.id, categoria: 'Gastos adm.',   montoUSD: 144000 },
    { proyectoId: tr1.id, categoria: 'Marketing',     montoUSD: 96000  },
    { proyectoId: tr2.id, categoria: 'Materiales',    montoUSD: 1240000 },
    { proyectoId: tr2.id, categoria: 'Mano de obra',  montoUSD: 930000  },
    { proyectoId: tr2.id, categoria: 'Equipamiento',  montoUSD: 310000  },
    { proyectoId: tr2.id, categoria: 'Gastos adm.',   montoUSD: 93000   },
    { proyectoId: tr2.id, categoria: 'Marketing',     montoUSD: 93000   },
    { proyectoId: rc.id,  categoria: 'Materiales',    montoUSD: 720000  },
    { proyectoId: rc.id,  categoria: 'Mano de obra',  montoUSD: 540000  },
    { proyectoId: rc.id,  categoria: 'Equipamiento',  montoUSD: 360000  },
    { proyectoId: rc.id,  categoria: 'Gastos adm.',   montoUSD: 108000  },
    { proyectoId: jn.id,  categoria: 'Materiales',    montoUSD: 600000  },
    { proyectoId: jn.id,  categoria: 'Mano de obra',  montoUSD: 450000  },
    { proyectoId: jn.id,  categoria: 'Equipamiento',  montoUSD: 225000  },
    { proyectoId: jn.id,  categoria: 'Marketing',     montoUSD: 75000   },
  ];
  await prisma.presupuestoItem.createMany({ data: presupItems, skipDuplicates: true });
  console.log('✅ Items de presupuesto creados');

  // ── UNIDADES TORRE ROBLE I (muestra) ──
  const dptosTR1 = [
    { codigo: '1A', piso: 1, tipo: 'DEPARTAMENTO', m2: 72,  precioBase: 72000,  estado: 'VENDIDO' },
    { codigo: '1B', piso: 1, tipo: 'DEPARTAMENTO', m2: 65,  precioBase: 65000,  estado: 'VENDIDO' },
    { codigo: '1C', piso: 1, tipo: 'DEPARTAMENTO', m2: 65,  precioBase: 65000,  estado: 'DISPONIBLE' },
    { codigo: '2A', piso: 2, tipo: 'DEPARTAMENTO', m2: 88,  precioBase: 88000,  estado: 'VENDIDO' },
    { codigo: '2B', piso: 2, tipo: 'DEPARTAMENTO', m2: 88,  precioBase: 88000,  estado: 'RESERVADO' },
    { codigo: '3A', piso: 3, tipo: 'DEPARTAMENTO', m2: 88,  precioBase: 88000,  estado: 'VENDIDO' },
    { codigo: '3B', piso: 3, tipo: 'DEPARTAMENTO', m2: 88,  precioBase: 88000,  estado: 'VENDIDO' },
    { codigo: '4A', piso: 4, tipo: 'DEPARTAMENTO', m2: 95,  precioBase: 95000,  estado: 'DISPONIBLE' },
    { codigo: '4B', piso: 4, tipo: 'DEPARTAMENTO', m2: 95,  precioBase: 95000,  estado: 'RESERVADO' },
    { codigo: '5D', piso: 5, tipo: 'PENTHOUSE',    m2: 110, precioBase: 110000, estado: 'VENDIDO' },
  ];
  for (const d of dptosTR1) {
    await prisma.unidad.upsert({
      where: { proyectoId_codigo: { proyectoId: tr1.id, codigo: d.codigo } },
      update: {}, create: { proyectoId: tr1.id, ...d }
    });
  }
  console.log('✅ Unidades creadas');

  // ── CLIENTES ──
  const clientesData = [
    { ci: '4521089', nombre: 'Marco',   apellido: 'Torrico', email: 'marco@email.com',    telefono: '+591 70012345' },
    { ci: '7834561', nombre: 'Claudia', apellido: 'Vargas',  email: 'c.vargas@email.com', telefono: '+591 71198234' },
    { ci: '3219870', nombre: 'Pedro',   apellido: 'Mamani',  email: 'p.mamani@email.com', telefono: '+591 69923456' },
    { ci: '5671234', nombre: 'Ana',     apellido: 'Flores',  email: 'ana@email.com',      telefono: '+591 72234567' },
    { ci: '6789012', nombre: 'Roberto', apellido: 'Quispe',  email: 'r.quispe@email.com', telefono: '+591 73456789' },
    { ci: '8901234', nombre: 'Carmen',  apellido: 'Mendez',  email: 'c.mendez@email.com', telefono: '+591 74567890' },
  ];
  for (const c of clientesData) {
    await prisma.cliente.upsert({ where: { ci: c.ci }, update: {}, create: c });
  }
  console.log('✅ Clientes creados');

  // ── PROVEEDORES ──
  const provsData = [
    { nombre: 'SOBOCE',             nit: '1001234567', categoria: 'Materiales',   rating: 5.0 },
    { nombre: 'Ferretería Norte',   nit: '2003456789', categoria: 'Materiales',   rating: 4.5 },
    { nombre: 'Electro Oriente',    nit: '3005678901', categoria: 'Electricidad', rating: 4.0 },
    { nombre: 'Hidráulica SRL',     nit: '4007890123', categoria: 'Plomería',     rating: 3.5 },
    { nombre: 'Cerámica Boliviana', nit: '5009012345', categoria: 'Acabados',     rating: 4.2 },
    { nombre: 'Agregados Bolivia',  nit: '6001234567', categoria: 'Áridos',       rating: 4.8 },
  ];
  for (const p of provsData) {
    await prisma.proveedor.upsert({ where: { nit: p.nit }, update: {}, create: p });
  }
  console.log('✅ Proveedores creados');

  // ── MATERIALES ──
  const matsData = [
    { nombre: 'Cemento Portland',     categoria: 'Materiales', unidad: 'bolsa', stockActual: 18,  stockMinimo: 50  },
    { nombre: 'Hierro corrugado Ø12', categoria: 'Materiales', unidad: 'kg',    stockActual: 2400, stockMinimo: 1000 },
    { nombre: 'Ladrillo gambote',     categoria: 'Materiales', unidad: 'millar', stockActual: 8,   stockMinimo: 10  },
    { nombre: 'Arena fina',           categoria: 'Materiales', unidad: 'm³',    stockActual: 15,  stockMinimo: 20  },
    { nombre: 'Ripio zarandeado',     categoria: 'Materiales', unidad: 'm³',    stockActual: 22,  stockMinimo: 15  },
    { nombre: 'Cable eléctrico Ø12',  categoria: 'Electricidad', unidad: 'm',   stockActual: 450, stockMinimo: 200 },
    { nombre: 'Tubo PVC Ø4"',        categoria: 'Plomería',   unidad: 'unidad', stockActual: 35,  stockMinimo: 20  },
    { nombre: 'Pintura látex blanco', categoria: 'Acabados',   unidad: 'galon', stockActual: 12,  stockMinimo: 30  },
  ];
  for (const m of matsData) {
    const existe = await prisma.material.findFirst({ where: { nombre: m.nombre } });
    if (!existe) await prisma.material.create({ data: m });
  }
  console.log('✅ Materiales creados');

  // ── EMPLEADOS ──
  const empsData = [
    { ci: '10001', nombre: 'Juan',    apellido: 'Flores',  cargo: 'Maestro mayor', especialidad: 'Estructura',  proyectoId: tr1.id, salarioBase: 8500, tipoContrato: 'INDEFINIDO',    fechaIngreso: new Date('2025-01-10'), estado: 'ACTIVO'   },
    { ci: '10002', nombre: 'Mario',   apellido: 'Condori', cargo: 'Electricista',  especialidad: 'Instalaciones', proyectoId: tr1.id, salarioBase: 7200, tipoContrato: 'POR_OBRA',    fechaIngreso: new Date('2025-03-15'), estado: 'ACTIVO'   },
    { ci: '10003', nombre: 'Sergio',  apellido: 'Ríos',    cargo: 'Plomero',       especialidad: 'Sanitaria',   proyectoId: tr1.id, salarioBase: 6800, tipoContrato: 'POR_OBRA',    fechaIngreso: new Date('2025-03-15'), estado: 'ACTIVO'   },
    { ci: '10004', nombre: 'Luis',    apellido: 'Choque',  cargo: 'Albañil',       especialidad: 'Mampostería', proyectoId: tr1.id, salarioBase: 5500, tipoContrato: 'POR_OBRA',    fechaIngreso: new Date('2025-02-01'), estado: 'LICENCIA' },
    { ci: '10005', nombre: 'Carlos',  apellido: 'Vega',    cargo: 'Pintor',        especialidad: 'Acabados',    proyectoId: tr1.id, salarioBase: 5000, tipoContrato: 'POR_OBRA',    fechaIngreso: new Date('2025-04-20'), estado: 'ACTIVO'   },
    { ci: '10006', nombre: 'Luis',    apellido: 'Mamani',  cargo: 'Vendedor',      especialidad: 'Comercial',   proyectoId: null,   salarioBase: 4200, tipoContrato: 'INDEFINIDO',  fechaIngreso: new Date('2025-01-05'), estado: 'ACTIVO'   },
    { ci: '10007', nombre: 'Ana',     apellido: 'Ríos',    cargo: 'Vendedora',     especialidad: 'Comercial',   proyectoId: null,   salarioBase: 4200, tipoContrato: 'INDEFINIDO',  fechaIngreso: new Date('2025-01-10'), estado: 'ACTIVO'   },
    { ci: '10008', nombre: 'Carmen',  apellido: 'Flores',  cargo: 'Administrativa', especialidad: 'Admin',      proyectoId: null,   salarioBase: 5800, tipoContrato: 'INDEFINIDO',  fechaIngreso: new Date('2024-11-01'), estado: 'ACTIVO'   },
  ];
  for (const e of empsData) {
    await prisma.empleado.upsert({ where: { ci: e.ci }, update: {}, create: e });
  }
  console.log('✅ Empleados creados');

  // ── MOVIMIENTOS FINANCIEROS (últimos 3 meses) ──
  const gerencia = usuarios[0];
  const movs = [
    { tipo: 'INGRESO', concepto: 'Pago cuota — M. Torrico',    proyectoId: tr1.id, categoria: 'Pago de cuota', montoUSD: 6600,  fecha: new Date('2026-05-17') },
    { tipo: 'INGRESO', concepto: 'Pago cuota — P. Mamani',     proyectoId: tr2.id, categoria: 'Pago de cuota', montoUSD: 2000,  fecha: new Date('2026-05-15') },
    { tipo: 'INGRESO', concepto: 'Reserva inicial — C. Mendez', proyectoId: tr2.id, categoria: 'Reserva',      montoUSD: 7800,  fecha: new Date('2026-05-13') },
    { tipo: 'EGRESO',  concepto: 'Planilla semana 20',          proyectoId: tr1.id, categoria: 'Nómina',        montoUSD: 4200,  fecha: new Date('2026-05-17') },
    { tipo: 'EGRESO',  concepto: 'OC-0044 Ferretería Norte',    proyectoId: tr2.id, categoria: 'Materiales',   montoUSD: 6200,  fecha: new Date('2026-05-16') },
    { tipo: 'EGRESO',  concepto: 'Honorarios ingeniero civil',  proyectoId: tr1.id, categoria: 'Gastos adm.',  montoUSD: 2400,  fecha: new Date('2026-05-14') },
    { tipo: 'INGRESO', concepto: 'Pago cuota — R. Quispe',      proyectoId: tr1.id, categoria: 'Pago de cuota', montoUSD: 2500,  fecha: new Date('2026-05-12') },
    { tipo: 'EGRESO',  concepto: 'Alquiler andamios mayo',      proyectoId: rc.id,  categoria: 'Equipamiento', montoUSD: 1800,  fecha: new Date('2026-05-12') },
    { tipo: 'EGRESO',  concepto: 'OC-0043 SOBOCE cemento',      proyectoId: rc.id,  categoria: 'Materiales',   montoUSD: 8000,  fecha: new Date('2026-05-10') },
    { tipo: 'INGRESO', concepto: 'Pago cuota — C. Vargas',      proyectoId: rc.id,  categoria: 'Pago de cuota', montoUSD: 1500,  fecha: new Date('2026-05-06') },
  ];
  for (let i = 0; i < movs.length; i++) {
    const m = movs[i];
    await prisma.movimientoFinanciero.create({
      data: {
        numero: `M-${String(i + 1270).padStart(4,'0')}`,
        ...m,
        monedaOrigen: 'USD',
        tipoCambio:   7.05,
        montoBs:      m.montoUSD * 7.05,
        metodo:       'Transferencia',
        registradoPorId: gerencia.id
      }
    });
  }
  console.log('✅ Movimientos financieros creados');

  // ── CAMPAÑAS ──
  const campanas = [
    { nombre: 'Torre Roble II — Lanzamiento', canal: 'FACEBOOK_ADS', proyectoId: tr2.id, objetivo: 'Generación de leads', presupuesto: 1200, gastado: 980,  metaLeads: 60, estado: 'ACTIVA'    },
    { nombre: 'Recordatorios pagos mayo',      canal: 'WHATSAPP',     proyectoId: null,   objetivo: 'Retención clientes',  presupuesto: 320,  gastado: 320,  metaLeads: 0,  estado: 'ACTIVA'    },
    { nombre: 'Render 3D Torre Roble I',       canal: 'INSTAGRAM',    proyectoId: tr1.id, objetivo: 'Reconocimiento',      presupuesto: 480,  gastado: 380,  metaLeads: 20, estado: 'ACTIVA'    },
    { nombre: 'Jardines Norte — Pre-venta',    canal: 'FACEBOOK_ADS', proyectoId: jn.id,  objetivo: 'Pre-venta',           presupuesto: 800,  gastado: 640,  metaLeads: 30, estado: 'PAUSADA'   },
    { nombre: 'Programa Referidos 2026',       canal: 'REFERIDOS',    proyectoId: null,   objetivo: 'Referidos',           presupuesto: 6000, gastado: 4000, metaLeads: 30, estado: 'ACTIVA'    },
    { nombre: 'Búsqueda departamentos Cbba',   canal: 'GOOGLE_ADS',   proyectoId: null,   objetivo: 'Captación',           presupuesto: 600,  gastado: 600,  metaLeads: 15, estado: 'FINALIZADA' },
  ];
  for (const c of campanas) {
    await prisma.campana.create({ data: { ...c, fechaInicio: new Date('2026-01-01') } });
  }
  console.log('✅ Campañas de marketing creadas');

  // ── REPORTES PROGRAMADOS ──
  await prisma.reporteProgramado.createMany({
    data: [
      { nombre: 'Reporte Gerencial Mensual', tipo: 'GERENCIAL',  frecuencia: 'MENSUAL',  diaMes: 1,  hora: '08:00', emails: ['gerencia@robles.com.bo'],                   formato: 'PDF',   proximaEjecucion: new Date('2026-06-01T08:00:00') },
      { nombre: 'Flujo de caja semanal',     tipo: 'FINANZAS',   frecuencia: 'SEMANAL',  diaSemana: 1, hora: '08:00', emails: ['finanzas@robles.com.bo'],                  formato: 'PDF',   proximaEjecucion: new Date('2026-05-25T08:00:00') },
      { nombre: 'Planilla RRHH mensual',     tipo: 'RRHH',       frecuencia: 'MENSUAL',  diaMes: 25, hora: '09:00', emails: ['rrhh@robles.com.bo','gerencia@robles.com.bo'], formato: 'EXCEL', proximaEjecucion: new Date('2026-05-25T09:00:00') },
      { nombre: 'Avance de proyectos',       tipo: 'PROYECTOS',  frecuencia: 'SEMANAL',  diaSemana: 5, hora: '17:00', emails: ['gerencia@robles.com.bo'],                  formato: 'PDF',   proximaEjecucion: new Date('2026-05-23T17:00:00'), activo: false },
    ],
    skipDuplicates: true
  });
  console.log('✅ Reportes programados creados');

  console.log('\n🎉 Seed completado exitosamente!');
  console.log('\n🔐 Credenciales de acceso:');
  console.log('   Email:    gerencia@robles.com.bo');
  console.log('   Password: Robles2026!');
  console.log('   Rol:      ADMIN\n');
}

main()
  .catch(e => { console.error('❌ Error en seed:', e); process.exit(1); })
  .finally(async () => await prisma.$disconnect());
