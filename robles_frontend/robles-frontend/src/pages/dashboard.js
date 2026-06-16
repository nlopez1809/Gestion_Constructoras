// src/pages/dashboard.js — Dashboard conectado al backend

import { dashboardApi, finanzasApi } from '../api/index.js';
import { fmt, estadoPill, toast, showLoading, hideLoading } from '../utils/ui.js';

export async function initDashboard(container) {
  container.innerHTML = renderSkeleton();

  try {
    showLoading('Cargando dashboard...');
    const [data, saldo] = await Promise.all([
      dashboardApi.kpis(),
      finanzasApi.saldoCaja()
    ]);
    hideLoading();
    container.innerHTML = renderDashboard(data, saldo);
    initCharts(data.graficoMeses);
  } catch (err) {
    hideLoading();
    toast('Error al cargar dashboard: ' + err.message, 'err');
    container.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted)">
      <p style="font-size:14px">Error al conectar con el servidor.</p>
      <button onclick="window.location.reload()" style="margin-top:12px;background:var(--bark);color:white;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-family:'DM Sans',sans-serif;">Reintentar</button>
    </div>`;
  }
}

function renderDashboard(data, saldo) {
  const { kpis, proyectos, cuotasVencidas, alertasLegales, graficoMeses } = data;

  return `
  <!-- KPIs -->
  <div class="kpi-row">
    <div class="kpi">
      <div class="kpi-top">
        <div class="ki g"><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
        <div class="trend fl">${kpis.proyectosActivos} activos</div>
      </div>
      <div class="kpi-val">${kpis.proyectosActivos}</div>
      <div class="kpi-lbl">Proyectos activos</div>
    </div>
    <div class="kpi">
      <div class="kpi-top">
        <div class="ki b"><svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
        <div class="trend up">↑ Este mes</div>
      </div>
      <div class="kpi-val">${fmt.usd(kpis.ingresosMes)}</div>
      <div class="kpi-lbl">Ingresos del mes (USD)</div>
    </div>
    <div class="kpi">
      <div class="kpi-top">
        <div class="ki gold"><svg viewBox="0 0 24 24"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/></svg></div>
        <div class="trend up">↑ ${kpis.ventasMes}</div>
      </div>
      <div class="kpi-val">${kpis.ventasMes}</div>
      <div class="kpi-lbl">Ventas este mes</div>
    </div>
    <div class="kpi">
      <div class="kpi-top">
        <div class="ki r"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
        <div class="trend fl">${kpis.empleadosActivos} activos</div>
      </div>
      <div class="kpi-val">${fmt.bs(kpis.planillaMes)}</div>
      <div class="kpi-lbl">Planilla mensual</div>
    </div>
  </div>

  <!-- Gráfico + Avance proyectos -->
  <div class="g21">
    <div class="panel">
      <div class="ph">
        <div><div class="pt">Ingresos vs Egresos</div><div class="ps">Últimos 6 meses — USD</div></div>
      </div>
      <div class="pb">
        <canvas id="chartIngEgr" height="160" style="width:100%"></canvas>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:14px">
      <div style="background:var(--white);border:1px solid var(--border);border-radius:14px;padding:16px">
        <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px">Avance proyectos</div>
        ${proyectos.map(p => `
          <div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span style="font-size:12px;color:var(--text-mid)">${p.nombre}</span>
              <span style="font-size:12px;font-weight:500;color:${p.avancePct>=90?'var(--gold)':'var(--leaf)'}">${fmt.pct(p.avancePct)}</span>
            </div>
            <div class="prog-bar"><div class="prog-fill" style="width:${p.avancePct}%;background:${p.avancePct>=90?'var(--gold)':p.avancePct<20?'var(--blue)':'var(--leaf)'}"></div></div>
          </div>
        `).join('')}
      </div>
      <div style="background:var(--white);border:1px solid var(--border);border-radius:14px;padding:14px">
        <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px">Saldo en caja</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:600;color:var(--bark)">${fmt.usd(saldo.saldoUSD)}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${fmt.bs(saldo.saldoBs)} · TC ${saldo.tcVigente}</div>
      </div>
    </div>
  </div>

  <!-- Pagos vencidos + Alertas -->
  <div class="g2">
    <div class="panel">
      <div class="ph">
        <div><div class="pt">Pagos pendientes</div><div class="ps">Cuotas vencidas sin cobrar</div></div>
        <button class="plink" onclick="window.navigateTo('ventas')">Ver todos</button>
      </div>
      <div class="tw">
        <table>
          <thead><tr><th>Cliente</th><th>Proyecto</th><th class="r">Monto</th><th class="r">Días vencido</th><th>Estado</th></tr></thead>
          <tbody>
            ${cuotasVencidas.length === 0
              ? `<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted)">Sin pagos vencidos ✓</td></tr>`
              : cuotasVencidas.map(c => `
                <tr>
                  <td><strong>${c.cliente}</strong></td>
                  <td>${c.proyecto}</td>
                  <td class="r" style="color:var(--red);font-weight:500">${fmt.usd(c.monto)}</td>
                  <td class="r">${c.diasVencido} días</td>
                  <td>${estadoPill('VENCIDO')}</td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
      </div>
    </div>
    <div class="panel">
      <div class="ph">
        <div><div class="pt">Alertas legales</div><div class="ps">Vencimientos próximos 30 días</div></div>
        <button class="plink" onclick="window.navigateTo('legal')">Ver todas</button>
      </div>
      <div class="pb">
        ${alertasLegales.length === 0
          ? `<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:12.5px">Sin alertas activas ✓</div>`
          : alertasLegales.map(a => `
            <div class="alert-box ${a.diasRestantes<=7?'e':'w'}" style="margin-bottom:8px">
              <div class="ab-ico">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <div>
                <div class="ab-ttl">${a.descripcion}</div>
                <div class="ab-desc">Vence ${fmt.fecha(a.vencimiento)} · ${a.diasRestantes} días restantes</div>
              </div>
            </div>
          `).join('')
        }
      </div>
    </div>
  </div>`;
}

function initCharts(meses) {
  if (!meses || !meses.length) return;
  const canvas = document.getElementById('chartIngEgr');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w   = canvas.parentElement.offsetWidth - 40;
  canvas.width  = w;
  canvas.height = 160;

  const pad  = { l: 50, r: 20, t: 20, b: 30 };
  const maxV = Math.max(...meses.map(m => Math.max(m.ingresos, m.egresos))) * 1.1 || 1;
  const barW = (w - pad.l - pad.r) / meses.length;

  ctx.clearRect(0, 0, w, 160);

  // Líneas guía
  ctx.strokeStyle = '#ede8e0'; ctx.lineWidth = .7;
  [0.25, 0.5, 0.75, 1].forEach(p => {
    const y = pad.t + (1 - p) * (160 - pad.t - pad.b);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
    ctx.fillStyle = '#9a8272'; ctx.font = '8.5px DM Sans'; ctx.textAlign = 'right';
    ctx.fillText(fmt.usd(maxV * p / 1000) + 'k', pad.l - 4, y + 3);
  });

  // Barras y flujo
  const netoPts = [];
  meses.forEach((m, i) => {
    const x   = pad.l + i * barW;
    const bw  = barW * 0.35;
    const hIng = ((m.ingresos / maxV) * (160 - pad.t - pad.b));
    const hEgr = ((m.egresos  / maxV) * (160 - pad.t - pad.b));
    const base = 160 - pad.b;

    // Ingreso
    ctx.fillStyle = '#4a8a30'; ctx.globalAlpha = .85;
    ctx.fillRect(x + barW * 0.08, base - hIng, bw, hIng);
    // Egreso
    ctx.fillStyle = '#a0622e'; ctx.globalAlpha = .7;
    ctx.fillRect(x + barW * 0.08 + bw + 2, base - hEgr, bw, hEgr);
    ctx.globalAlpha = 1;

    // Etiqueta mes
    ctx.fillStyle = '#9a8272'; ctx.font = i === meses.length-1 ? 'bold 8.5px DM Sans' : '8.5px DM Sans';
    ctx.textAlign = 'center';
    ctx.fillText(m.mesLabel.slice(0,3), x + barW / 2, 160 - 6);

    // Punto línea flujo neto
    const netoPct = ((m.neto / maxV));
    const netoY   = pad.t + (1 - Math.max(0, netoPct)) * (160 - pad.t - pad.b);
    netoPts.push({ x: x + barW / 2, y: netoY });
  });

  // Línea flujo neto
  ctx.strokeStyle = '#b8872a'; ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  netoPts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.stroke();
  ctx.setLineDash([]);

  // Puntos
  netoPts.forEach(p => {
    ctx.fillStyle = '#b8872a'; ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill();
  });
}

function renderSkeleton() {
  return `<div style="padding:24px">
    ${[1,2,3,4].map(() => `
      <div style="height:90px;background:linear-gradient(90deg,#f0ede8 25%,#e8e4de 50%,#f0ede8 75%);background-size:200% 100%;border-radius:14px;margin-bottom:13px;animation:shimmer 1.5s infinite;"></div>
    `).join('')}
    <style>@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}</style>
  </div>`;
}
