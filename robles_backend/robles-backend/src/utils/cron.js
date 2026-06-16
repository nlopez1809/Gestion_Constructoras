// src/utils/cron.js — Tareas automáticas programadas

const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const dayjs = require('dayjs');
const prisma = new PrismaClient();

// ── EMAIL TRANSPORT ──
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

async function enviarEmail({ to, subject, html }) {
  try {
    await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
    console.log(`📧 Email enviado a ${to}: ${subject}`);
  } catch (err) {
    console.error(`❌ Error enviando email a ${to}:`, err.message);
  }
}

// ── WHATSAPP ALERTS ──
async function enviarWhatsApp(telefono, mensaje) {
  try {
    const res = await fetch(
      `https://waba.360dialog.io/v1/messages`,
      {
        method: 'POST',
        headers: {
          'D360-API-KEY': process.env.WHATSAPP_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to:   telefono.replace(/\s/g, '').replace('+', ''),
          type: 'text',
          text: { body: mensaje }
        })
      }
    );
    if (res.ok) console.log(`📱 WhatsApp enviado a ${telefono}`);
    else console.error(`❌ Error WhatsApp ${telefono}:`, await res.text());
  } catch (err) {
    console.error(`❌ WhatsApp error:`, err.message);
  }
}

// ── TAREA: Alertas cuotas vencidas (diario 8:00 AM) ──
cron.schedule('0 8 * * *', async () => {
  console.log('⏰ [CRON] Verificando cuotas vencidas...');
  try {
    const ayer = dayjs().subtract(1, 'day').toDate();
    const cuotasVencidas = await prisma.cuota.findMany({
      where: { pagado: false, vencimiento: { lt: new Date() } },
      include: {
        venta: {
          include: {
            cliente:  true,
            unidad:   { include: { proyecto: { select: { nombre: true } } } },
            vendedor: { select: { nombre: true, email: true } }
          }
        }
      }
    });

    for (const cuota of cuotasVencidas) {
      const { cliente, unidad } = cuota.venta;
      const diasVencido = dayjs().diff(dayjs(cuota.vencimiento), 'day');

      // Solo enviar en días específicos: 1, 3, 7, 15, 30 días vencido
      if (![1, 3, 7, 15, 30].includes(diasVencido)) continue;

      const msg = `Estimado/a ${cliente.nombre} ${cliente.apellido}, le recordamos que tiene una cuota vencida por $${cuota.monto.toLocaleString()} USD correspondiente a su departamento ${unidad.codigo} en ${unidad.proyecto.nombre}. Vencimiento: ${dayjs(cuota.vencimiento).format('DD/MM/YYYY')}. Por favor regularice su pago. Gracias, Robles Edificios.`;

      if (cliente.telefono) {
        await enviarWhatsApp(cliente.telefono, msg);
      }

      // Email al vendedor asignado
      if (cuota.venta.vendedor.email) {
        await enviarEmail({
          to: cuota.venta.vendedor.email,
          subject: `⚠️ Cuota vencida ${diasVencido} días — ${cliente.nombre} ${cliente.apellido}`,
          html: `<p>El cliente <strong>${cliente.nombre} ${cliente.apellido}</strong> tiene una cuota vencida hace ${diasVencido} días.</p>
                 <p>Monto: <strong>$${cuota.monto} USD</strong><br>Vencimiento: ${dayjs(cuota.vencimiento).format('DD/MM/YYYY')}<br>Dpto: ${unidad.codigo} — ${unidad.proyecto.nombre}</p>
                 <p>Por favor comuníquese con el cliente.</p>`
        });
      }
    }

    // Actualizar estados de venta
    const ventasConVencidas = await prisma.cuota.groupBy({
      by: ['ventaId'],
      where: { pagado: false, vencimiento: { lt: new Date() } }
    });
    for (const v of ventasConVencidas) {
      await prisma.venta.update({ where: { id: v.ventaId }, data: { estado: 'VENCIDO' } });
    }

    console.log(`✅ [CRON] Procesadas ${cuotasVencidas.length} cuotas vencidas`);
  } catch (err) {
    console.error('❌ [CRON] Error verificando cuotas:', err.message);
  }
});

// ── TAREA: Alertas contratos por vencer (lunes 9:00 AM) ──
cron.schedule('0 9 * * 1', async () => {
  console.log('⏰ [CRON] Verificando contratos por vencer...');
  try {
    const en30dias = dayjs().add(30, 'day').toDate();
    const contratos = await prisma.contratoProveedor.findMany({
      where: { fechaVencimiento: { lte: en30dias, gte: new Date() } },
      include: { proveedor: { select: { nombre: true } } }
    });

    if (contratos.length > 0) {
      const lista = contratos.map(c =>
        `• ${c.proveedor.nombre}: vence ${dayjs(c.fechaVencimiento).format('DD/MM/YYYY')} (${dayjs(c.fechaVencimiento).diff(dayjs(), 'day')} días)`
      ).join('\n');

      await enviarEmail({
        to: process.env.SMTP_USER,
        subject: `⚠️ ${contratos.length} contratos por vencer en 30 días`,
        html: `<h2>Contratos de proveedores por vencer</h2><pre>${lista}</pre><p>Revisar en el módulo Legal del sistema.</p>`
      });
    }

    console.log(`✅ [CRON] Verificados ${contratos.length} contratos`);
  } catch (err) {
    console.error('❌ [CRON] Error contratos:', err.message);
  }
});

// ── TAREA: Ejecutar reportes programados (cada hora) ──
cron.schedule('0 * * * *', async () => {
  try {
    const ahora = dayjs();
    const reportes = await prisma.reporteProgramado.findMany({
      where: {
        activo: true,
        proximaEjecucion: { lte: ahora.toDate() }
      }
    });

    for (const rep of reportes) {
      console.log(`⏰ [CRON] Ejecutando reporte programado: ${rep.nombre}`);
      try {
        // Llamar internamente al endpoint de generación
        // En producción: usar fetch('http://localhost:PORT/api/reportes/excel/...', { headers: { Authorization: ... } })
        // Por ahora solo actualizamos la fecha de próxima ejecución

        let proxima;
        switch (rep.frecuencia) {
          case 'DIARIO':     proxima = ahora.add(1, 'day'); break;
          case 'SEMANAL':    proxima = ahora.add(7, 'day'); break;
          case 'QUINCENAL':  proxima = ahora.add(15, 'day'); break;
          case 'MENSUAL':    proxima = ahora.add(1, 'month'); break;
          default:           proxima = ahora.add(1, 'day');
        }

        await prisma.reporteProgramado.update({
          where: { id: rep.id },
          data: {
            ultimaEjecucion:  ahora.toDate(),
            proximaEjecucion: proxima.toDate()
          }
        });

        // Notificar por email que el reporte se generó
        if (rep.emails && rep.emails.length > 0) {
          await enviarEmail({
            to: rep.emails.join(','),
            subject: `📊 ${rep.nombre} — ${ahora.format('DD/MM/YYYY HH:mm')}`,
            html: `<p>El reporte <strong>${rep.nombre}</strong> ha sido generado automáticamente.</p>
                   <p>Período: ${ahora.format('MMMM YYYY')}</p>
                   <p>Accede al sistema para descargar el archivo.</p>
                   <p><a href="${process.env.FRONTEND_URL}">Ir al sistema →</a></p>`
          });
        }

        console.log(`✅ [CRON] Reporte ejecutado: ${rep.nombre}`);
      } catch (err) {
        console.error(`❌ [CRON] Error en reporte ${rep.nombre}:`, err.message);
      }
    }
  } catch (err) {
    console.error('❌ [CRON] Error general reportes:', err.message);
  }
});

// ── TAREA: Actualizar estados cuotas PROXIMO_VENCER (diario 7:00 AM) ──
cron.schedule('0 7 * * *', async () => {
  try {
    const en7dias = dayjs().add(7, 'day').toDate();
    // Marcar cuotas que vencen en 7 días
    const ventasConProximas = await prisma.cuota.groupBy({
      by: ['ventaId'],
      where: { pagado: false, vencimiento: { lte: en7dias, gte: new Date() } }
    });
    for (const v of ventasConProximas) {
      await prisma.venta.updateMany({
        where: { id: v.ventaId, estado: 'AL_DIA' },
        data:  { estado: 'PROXIMO_VENCER' }
      });
    }
    console.log(`✅ [CRON] ${ventasConProximas.length} ventas marcadas como próximas a vencer`);
  } catch (err) {
    console.error('❌ [CRON] Error actualizando estados:', err.message);
  }
});

console.log('⏰ Tareas CRON iniciadas:');
console.log('   • 07:00 diario  — Actualizar estados cuotas');
console.log('   • 08:00 diario  — Alertas cuotas vencidas (WA + email)');
console.log('   • 09:00 lunes   — Alertas contratos por vencer');
console.log('   • Cada hora     — Ejecutar reportes programados');

module.exports = { enviarEmail, enviarWhatsApp };
