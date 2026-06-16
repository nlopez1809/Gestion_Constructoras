// src/app.js — Punto de entrada principal de la SPA
import AuthStore from './store/auth.js';
import { initDashboard }  from './pages/dashboard.js';
import { initVentas }     from './pages/ventas.js';
import { initProyectos }  from './pages/proyectos.js';
import { initRRHH }       from './pages/rrhh.js';
import { initFinanzas }   from './pages/finanzas.js';
import { initCostos }     from './pages/costos.js';
import { initLegal }      from './pages/legal.js';
import { initMarketing }  from './pages/marketing.js';

// ── VERIFICAR AUTENTICACIÓN ──
if (!AuthStore.isAuthenticated) {
  window.location.href = './login.html';
}

// ── RUTAS DE MÓDULOS ──
const MODULES = {
  dashboard: { title: 'Dashboard general',      sub: 'Vista consolidada de todos los proyectos',              init: initDashboard,  btnLabel: 'Nuevo registro' },
  ventas:    { title: 'Módulo de Ventas',        sub: 'Clientes · pagos · comisiones · historial',             init: initVentas,     btnLabel: 'Nueva venta' },
  proyectos: { title: 'Módulo de Proyectos',     sub: 'Avance · etapas · unidades · cronograma',              init: initProyectos,  btnLabel: 'Nuevo proyecto' },
  compras:   { title: 'Compras y Materiales',    sub: 'Proveedores · OC · inventario · historial',            init: initCompras,    btnLabel: 'Nueva OC' },
  costos:    { title: 'Control de Costos',       sub: 'Presupuesto vs ejecutado · desviaciones · rentabilidad', init: initCostos,   btnLabel: 'Registrar gasto' },
  finanzas:  { title: 'Módulo Financiero',       sub: 'Ingresos · egresos · flujo de caja · tipo de cambio',  init: initFinanzas,   btnLabel: 'Registrar movimiento' },
  rrhh:      { title: 'Recursos Humanos',        sub: 'Empleados · asistencia · planilla · comisiones',       init: initRRHH,       btnLabel: 'Nuevo empleado' },
  legal:     { title: 'Módulo Legal',            sub: 'Contratos · documentos · alertas de vencimiento',      init: initLegal,      btnLabel: 'Nuevo contrato' },
  marketing: { title: 'Módulo de Marketing',     sub: 'Campañas · leads · conversiones · efectividad',        init: initMarketing,  btnLabel: 'Nueva campaña' },
  reportes:  { title: 'Reportes y Exportación',  sub: 'Genera reportes PDF y Excel de todos los módulos',     init: initReportes,   btnLabel: 'Exportar todo' },
};

let _currentModule = 'dashboard';

// ── NAVEGACIÓN ──
window.navigateTo = function(moduleId) {
  if (!MODULES[moduleId]) return;
  _currentModule = moduleId;
  const mod = MODULES[moduleId];

  // Actualizar topbar
  document.getElementById('page-title').textContent = mod.title;
  document.getElementById('page-sub').textContent   = mod.sub;
  document.getElementById('btn-action-lbl').textContent = mod.btnLabel;

  // Actualizar sidebar activo
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.module === moduleId);
    el.querySelector('.ni')?.classList.remove('active');
  });

  // Renderizar página
  const content = document.getElementById('app-content');
  content.innerHTML = '';
  content.style.animation = 'none';
  requestAnimationFrame(() => {
    content.style.animation = 'fadeUp .25s ease both';
    mod.init(content);
  });
};

// ── CLOCK ──
const DAYS   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function clock() {
  const n = new Date();
  const pad = x => String(x).padStart(2,'0');
  document.getElementById('dt-date').textContent =
    `${DAYS[n.getDay()]} ${n.getDate()} de ${MONTHS[n.getMonth()]} de ${n.getFullYear()}`;
  document.getElementById('dt-time').textContent =
    `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
}
clock();
setInterval(clock, 1000);

// ── USUARIO ──
const user = AuthStore.user;
if (user) {
  document.getElementById('sb-user-name').textContent = user.nombre;
  document.getElementById('sb-user-role').textContent = user.rol;
  document.getElementById('sb-user-av').textContent   = user.nombre.slice(0,2).toUpperCase();
}

// ── LOGOUT ──
document.getElementById('btn-logout').addEventListener('click', () => {
  if (confirm('¿Cerrar sesión?')) AuthStore.logout();
});

// ── SIDEBAR TOGGLE ──
document.getElementById('btn-sidebar-toggle').addEventListener('click', () => {
  document.body.classList.toggle('sb-hidden');
});

// ── ACCIONES GLOBALES (botón + de topbar) ──
document.getElementById('btn-global-action').addEventListener('click', () => {
  document.getElementById('globalModal')?.classList.add('open');
});

// ── MÓDULO COMPRAS (stub) ──
async function initCompras(container) {
  const { ordenesApi, proveedoresApi, materialesApi } = await import('./api/index.js');
  const { fmt, estadoPill, toast, showLoading, hideLoading, renderTable } = await import('./utils/ui.js');

  container.innerHTML = `
    <div class="tabs">
      <div class="tab active" data-tab="ordenes">Órdenes de compra</div>
      <div class="tab" data-tab="proveedores">Proveedores</div>
      <div class="tab" data-tab="inventario">Inventario</div>
    </div>
    <div id="compras-content" style="padding:0 24px 24px"></div>
  `;
  const el = container.querySelector('#compras-content');

  container.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderComprasTab(tab.dataset.tab, el, { ordenesApi, proveedoresApi, materialesApi, fmt, estadoPill, toast, showLoading, hideLoading, renderTable });
    });
  });
  renderComprasTab('ordenes', el, { ordenesApi, proveedoresApi, materialesApi, fmt, estadoPill, toast, showLoading, hideLoading, renderTable });
}

async function renderComprasTab(tab, el, deps) {
  const { ordenesApi, proveedoresApi, materialesApi, fmt, estadoPill, toast, showLoading, hideLoading, renderTable } = deps;
  showLoading();
  try {
    if (tab === 'ordenes') {
      const data = await ordenesApi.list({ limit: 20 });
      hideLoading();
      el.innerHTML = `
        <div class="search-row" style="margin-top:20px">
          <select class="sel" id="filtroEstOC">
            <option value="">Todos los estados</option>
            ${['SOLICITADA','APROBADA','EMITIDA','EN_TRANSITO','RECIBIDA','PAGADA'].map(e=>`<option value="${e}">${e.replace('_',' ')}</option>`).join('')}
          </select>
          <button class="btn-pri" style="height:36px">
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Nueva OC
          </button>
        </div>
        <div class="panel">
          <div class="tw"><table>
            <thead><tr><th>#</th><th>Proveedor</th><th>Proyecto</th><th>Items</th><th class="r">Total</th><th>Emisión</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              ${data.ordenes.map(o=>`
                <tr>
                  <td style="font-size:11px;color:var(--text-muted)">${o.numero}</td>
                  <td><strong>${o.proveedor?.nombre||'—'}</strong></td>
                  <td>${o.proyecto?.nombre||'—'}</td>
                  <td>${o.items?.length||0}</td>
                  <td class="r" style="color:var(--leaf);font-weight:500">${fmt.usd(o.total)}</td>
                  <td>${fmt.fecha(o.fechaEmision)}</td>
                  <td>${estadoPill(o.estado)}</td>
                  <td>
                    <select style="font-size:10.5px;background:var(--off);border:1px solid var(--border);border-radius:6px;padding:3px 6px;cursor:pointer" onchange="cambiarEstadoOC('${o.id}',this.value)">
                      <option value="">Cambiar estado</option>
                      ${['APROBADA','EMITIDA','EN_TRANSITO','RECIBIDA','PAGADA'].map(e=>`<option value="${e}">${e.replace('_',' ')}</option>`).join('')}
                    </select>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table></div>
        </div>
      `;
      window.cambiarEstadoOC = async (id, estado) => {
        if (!estado) return;
        try {
          await ordenesApi.cambiarEstado(id, estado);
          toast('Estado actualizado', 'ok');
          renderComprasTab('ordenes', el, deps);
        } catch(err) { toast('Error: '+err.message,'err'); }
      };
    } else if (tab === 'proveedores') {
      const provs = await proveedoresApi.list();
      hideLoading();
      el.innerHTML = `
        <div style="margin-top:20px">
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:13px">
            ${provs.map(p=>`
              <div style="background:var(--white);border:1px solid var(--border);border-radius:13px;padding:16px">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
                  <div>
                    <div style="font-family:'Cormorant Garamond',serif;font-size:15px;font-weight:600;color:var(--bark)">${p.nombre}</div>
                    <div style="font-size:11px;color:var(--text-muted)">${p.categoria} · NIT: ${p.nit}</div>
                  </div>
                  <div style="font-size:13px;font-weight:600;color:var(--gold)">${'★'.repeat(Math.round(p.rating))}${'☆'.repeat(5-Math.round(p.rating))}</div>
                </div>
                <div style="font-size:11px;color:var(--text-muted)">${p._count?.ordenes||0} órdenes · ${p.telefono||'Sin teléfono'}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (tab === 'inventario') {
      const mats = await materialesApi.listaInv();
      hideLoading();
      el.innerHTML = `
        <div class="panel" style="margin-top:20px">
          <div class="ph"><div><div class="pt">Inventario de materiales</div><div class="ps">Stock actual con alerta semáforo</div></div></div>
          <div class="tw"><table>
            <thead><tr><th>Material</th><th>Categoría</th><th>Unidad</th><th class="r">Stock actual</th><th class="r">Stock mínimo</th><th>Nivel</th></tr></thead>
            <tbody>
              ${mats.map((m,i)=>`
                <tr style="background:${i%2===1?'var(--off)':'var(--white)'}">
                  <td><strong>${m.nombre}</strong></td>
                  <td>${m.categoria}</td>
                  <td>${m.unidad}</td>
                  <td class="r" style="color:${m.alertaNivel==='CRITICO'?'var(--red)':m.alertaNivel==='BAJO'?'var(--gold)':'var(--leaf)'};font-weight:600">${m.stockActual}</td>
                  <td class="r" style="color:var(--text-muted)">${m.stockMinimo}</td>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px">
                      <div style="width:60px;height:6px;background:var(--border);border-radius:20px;overflow:hidden">
                        <div style="width:${m.pctStock||0}%;height:100%;background:${m.alertaNivel==='CRITICO'?'var(--red)':m.alertaNivel==='BAJO'?'var(--gold)':'var(--leaf)'};border-radius:20px"></div>
                      </div>
                      <span style="font-size:10px;font-weight:500;color:${m.alertaNivel==='CRITICO'?'var(--red)':m.alertaNivel==='BAJO'?'var(--gold)':'var(--leaf)'}">${m.alertaNivel}</span>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table></div>
        </div>
      `;
    }
  } catch(err) { hideLoading(); deps.toast('Error: '+err.message,'err'); }
}

// ── MÓDULO REPORTES ──
async function initReportes(container) {
  const { reportesApi } = await import('./api/index.js');
  const { toast, showLoading, hideLoading } = await import('./utils/ui.js');

  container.innerHTML = `
    <div style="padding:24px">
      <div class="kpi-row">
        <div class="kpi"><div class="kpi-top"><div class="ki g"></div><div class="trend fl">Disponibles</div></div><div class="kpi-val">10</div><div class="kpi-lbl">Tipos de reporte</div></div>
        <div class="kpi"><div class="kpi-top"><div class="ki gold"></div><div class="trend fl">Histórico</div></div><div class="kpi-val" id="total-reps">—</div><div class="kpi-lbl">Reportes generados</div></div>
        <div class="kpi"><div class="kpi-top"><div class="ki pu"></div><div class="trend fl">Auto</div></div><div class="kpi-val" id="total-prog">—</div><div class="kpi-lbl">Programados activos</div></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:13px;margin-bottom:20px">
        ${[
          ['Ventas','var(--leaf)','var(--leaf-pale)','ventas'],
          ['Finanzas','var(--gold)','var(--gold-bg)','planilla'],
          ['Gastos/Costos','var(--blue)','var(--blue-bg)','gastos'],
        ].map(([nombre,color,bg,tipo]) => `
          <div style="background:var(--white);border:1px solid var(--border);border-radius:14px;padding:20px;position:relative;overflow:hidden">
            <div style="position:absolute;top:0;left:0;right:0;height:4px;background:${color}"></div>
            <div style="width:44px;height:44px;background:${bg};border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:10px">
              <svg style="width:20px;height:20px;fill:none;stroke:${color};stroke-width:1.6;stroke-linecap:round" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            </div>
            <div style="font-family:'Cormorant Garamond',serif;font-size:15px;font-weight:600;color:var(--bark);margin-bottom:4px">Reporte de ${nombre}</div>
            <div style="display:flex;gap:8px;margin-top:12px">
              <button onclick="descargarReporte('${tipo}')" style="flex:1;background:var(--bark);color:white;border:none;border-radius:8px;padding:7px;font-size:11.5px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif">↓ PDF / Excel</button>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="panel">
        <div class="ph"><div><div class="pt">Historial de exportaciones</div></div></div>
        <div id="historial-reps"><div style="padding:20px;text-align:center;color:var(--text-muted)">Cargando...</div></div>
      </div>
    </div>
  `;

  window.descargarReporte = async (tipo) => {
    showLoading('Generando reporte...');
    try {
      if (tipo === 'ventas')   await reportesApi.descargarVentas({});
      if (tipo === 'planilla') await reportesApi.descargarPlanilla({ periodo: new Date().toISOString().slice(0,7) });
      if (tipo === 'gastos')   await reportesApi.descargarGastos({});
      hideLoading();
      toast('Reporte descargado correctamente', 'ok');
      cargarHistorial();
    } catch(err) { hideLoading(); toast('Error al generar reporte: '+err.message,'err'); }
  };

  const cargarHistorial = async () => {
    try {
      const hist = await reportesApi.historial();
      const prog = await reportesApi.programados();
      document.getElementById('total-reps').textContent = hist.length;
      document.getElementById('total-prog').textContent = prog.filter(p=>p.activo).length;
      document.getElementById('historial-reps').innerHTML = `
        <div class="tw"><table>
          <thead><tr><th>Reporte</th><th>Módulo</th><th>Generado por</th><th>Fecha</th><th>Formato</th></tr></thead>
          <tbody>
            ${hist.map((h,i)=>`
              <tr style="background:${i%2===1?'var(--off)':'var(--white)'}">
                <td><strong>${h.nombre}</strong></td>
                <td>${h.modulo}</td>
                <td>${h.generadoPor?.nombre||'—'}</td>
                <td>${new Date(h.createdAt).toLocaleString('es-BO')}</td>
                <td><span style="background:var(--leaf-pale);color:var(--leaf);padding:2px 9px;border-radius:20px;font-size:10px;font-weight:500">${h.formato}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table></div>
      `;
    } catch(err) { console.error(err); }
  };
  cargarHistorial();
}

// ── INICIAR APP ──
window.navigateTo('dashboard');
