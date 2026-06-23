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
  window.location.href = './robles_login.html';
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
document.getElementById('btn-global-action').addEventListener('click', async () => {
  const modal = document.getElementById('globalModal');
  const title = document.getElementById('modal-title');
  const body  = document.getElementById('modal-body');
  if (!modal || !body) return;

  const { proyectosApi, clientesApi, empleadosApi, ventasApi, unidadesApi, gastosApi, finanzasApi, contratosApi, campanasApi, leadsApi } = await import('./api/index.js');
  const { toast, showLoading, hideLoading } = await import('./utils/ui.js');

  const inputStyle = 'width:100%;background:var(--off);border:1px solid var(--border);border-radius:8px;padding:9px 12px;font-size:13px;font-family:"DM Sans",sans-serif;color:var(--text);outline:none;';
  const labelStyle = 'font-size:10px;font-weight:500;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;display:block;';
  const fgStyle = 'margin-bottom:12px;';
  const btnStyle = 'width:100%;background:var(--bark);color:white;border:none;border-radius:10px;padding:12px;font-size:13px;font-weight:500;cursor:pointer;font-family:"DM Sans",sans-serif;margin-top:8px;';
  const rowStyle = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;';

  const forms = {
    dashboard: () => { title.textContent = 'Acción rápida'; body.innerHTML = `<p style="color:var(--text-muted);font-size:12.5px">Navega a un módulo específico y usa el botón + para crear registros.</p>`; },

    proyectos: async () => {
      title.textContent = 'Nuevo proyecto';
      body.innerHTML = `<form id="frmGlobal">
        <div style="${fgStyle}"><label style="${labelStyle}">Código</label><input style="${inputStyle}" name="codigo" placeholder="TR3" required></div>
        <div style="${fgStyle}"><label style="${labelStyle}">Nombre</label><input style="${inputStyle}" name="nombre" placeholder="Torre Roble III" required></div>
        <div style="${fgStyle}"><label style="${labelStyle}">Ubicación</label><input style="${inputStyle}" name="ubicacion" placeholder="Av. América 1234" required></div>
        <div style="${rowStyle}">
          <div style="${fgStyle}"><label style="${labelStyle}">Ciudad</label><input style="${inputStyle}" name="ciudad" value="Cochabamba"></div>
          <div style="${fgStyle}"><label style="${labelStyle}">Total unidades</label><input style="${inputStyle}" name="totalUnidades" type="number" placeholder="24" required></div>
        </div>
        <div style="${rowStyle}">
          <div style="${fgStyle}"><label style="${labelStyle}">Total m²</label><input style="${inputStyle}" name="totalM2" type="number" step="0.01" required></div>
          <div style="${fgStyle}"><label style="${labelStyle}">Presupuesto USD</label><input style="${inputStyle}" name="presupuesto" type="number" step="0.01" required></div>
        </div>
        <div style="${rowStyle}">
          <div style="${fgStyle}"><label style="${labelStyle}">Fecha inicio</label><input style="${inputStyle}" name="fechaInicio" type="date" required></div>
          <div style="${fgStyle}"><label style="${labelStyle}">Fecha entrega</label><input style="${inputStyle}" name="fechaEntrega" type="date" required></div>
        </div>
        <button type="submit" style="${btnStyle}">Crear proyecto</button>
      </form>`;
      document.getElementById('frmGlobal').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          showLoading('Creando proyecto...');
          await proyectosApi.create({ codigo: fd.get('codigo'), nombre: fd.get('nombre'), ubicacion: fd.get('ubicacion'), ciudad: fd.get('ciudad'), totalUnidades: +fd.get('totalUnidades'), totalM2: +fd.get('totalM2'), presupuesto: +fd.get('presupuesto'), fechaInicio: fd.get('fechaInicio'), fechaEntrega: fd.get('fechaEntrega') });
          hideLoading(); toast('Proyecto creado', 'ok'); modal.classList.remove('open'); window.navigateTo('proyectos');
        } catch(err) { hideLoading(); toast('Error: '+err.message, 'err'); }
      };
    },

    ventas: async () => {
      title.textContent = 'Nueva venta';
      const { authApi: aApi } = await import('./api/index.js');
      let clientes = [], proyectos = [], usuarios = [];
      try { [clientes, proyectos, usuarios] = await Promise.all([clientesApi.list(), proyectosApi.list(), aApi.usuarios().catch(()=>[])]); } catch(err) { toast('Error cargando datos: '+err.message, 'err'); return; }
      clientes = Array.isArray(clientes) ? clientes : (clientes.clientes || []);
      body.innerHTML = `<form id="frmGlobal">
        <div style="${fgStyle}"><label style="${labelStyle}">Cliente</label><div style="display:flex;gap:8px"><select style="${inputStyle};flex:1" name="clienteId" id="selClienteVenta" required><option value="">Seleccionar...</option>${clientes.map(c=>`<option value="${c.id}">${c.nombre} ${c.apellido} — ${c.ci||''}</option>`).join('')}</select><button type="button" id="btnAddClienteRapido" style="min-width:36px;height:38px;background:var(--leaf);color:white;border:none;border-radius:8px;font-size:18px;cursor:pointer" title="Nuevo cliente">+</button></div></div>
        <div style="${fgStyle}"><label style="${labelStyle}">Proyecto</label><select style="${inputStyle}" id="selProyVenta" required><option value="">Seleccionar...</option>${proyectos.map(p=>`<option value="${p.id}">${p.nombre}</option>`).join('')}</select></div>
        <div style="${fgStyle}"><label style="${labelStyle}">Unidad</label><select style="${inputStyle}" name="unidadId" id="selUnidadVenta" required><option value="">Primero seleccione proyecto</option></select></div>
        <div id="unidadPreview"></div>
        <div style="${rowStyle}">
          <div style="${fgStyle}"><label style="${labelStyle}">Precio final USD</label><input style="${inputStyle}" name="precioFinal" id="precioVenta" type="number" step="0.01" required></div>
          <div style="${fgStyle}"><label style="${labelStyle}">Total cuotas</label><input style="${inputStyle}" name="totalCuotas" type="number" value="36" required></div>
        </div>
        <div style="${rowStyle}">
          <div style="${fgStyle}"><label style="${labelStyle}">Vendedor</label><select style="${inputStyle}" name="vendedorId" id="selVendedor" required><option value="">Seleccionar vendedor...</option>${usuarios.map(u=>`<option value="${u.id}">${u.nombre} (${u.rol})</option>`).join('')}</select></div>
          <div style="${fgStyle}"><label style="${labelStyle}">Comisión %</label><input style="${inputStyle}" name="porcentajeComision" id="pctComision" type="number" step="0.1" min="0" max="100" value="3" placeholder="3"></div>
        </div>
        <div id="comisionPreview" style="margin-bottom:12px"></div>
        <div style="${fgStyle}"><label style="${labelStyle}">Fecha de venta</label><input style="${inputStyle}" name="fechaVenta" type="date" value="${new Date().toISOString().slice(0,10)}" required></div>
        <div style="${fgStyle}"><label style="${labelStyle}">Observación</label><input style="${inputStyle}" name="observacion" placeholder="Notas adicionales (opcional)"></div>
        <button type="submit" style="${btnStyle}">Registrar venta</button>
      </form>`;
      let _unisVenta = [];
      document.getElementById('selProyVenta').onchange = async (ev) => {
        const sel = document.getElementById('selUnidadVenta');
        document.getElementById('unidadPreview').innerHTML = '';
        if (!ev.target.value) { sel.innerHTML = '<option value="">Primero seleccione proyecto</option>'; _unisVenta=[]; return; }
        _unisVenta = await unidadesApi.list({ proyectoId: ev.target.value, estado: 'DISPONIBLE' });
        sel.innerHTML = `<option value="">Seleccionar...</option>${(_unisVenta||[]).map(u=>`<option value="${u.id}">${u.codigo} — ${u.tipo.replace('_',' ')} — ${u.m2}m² — $${u.precioBase}</option>`).join('')}`;
        if (!_unisVenta.length) sel.innerHTML = '<option value="">Sin unidades disponibles</option>';
      };
      document.getElementById('selUnidadVenta').onchange = (ev) => {
        const u = _unisVenta.find(x => x.id === ev.target.value);
        const prev = document.getElementById('unidadPreview');
        if (!u) { prev.innerHTML = ''; return; }
        document.getElementById('precioVenta').value = u.precioBase;
        prev.innerHTML = `<div style="background:#e8f5e1;border:2px solid #4a8a30;border-radius:10px;padding:12px;margin-bottom:12px;display:flex;align-items:center;gap:12px">
          <span style="font-size:22px">🏢</span>
          <div style="flex:1">
            <div style="font-weight:600;color:#2d5a1e;font-size:14px">${u.codigo} — ${u.tipo.replace('_',' ')}</div>
            <div style="font-size:11px;color:#5a7a4a">Piso ${u.piso} · ${u.m2} m² · Precio base: $${u.precioBase.toLocaleString()}</div>
          </div>
          <span style="background:#4a8a30;color:white;font-size:10px;padding:3px 10px;border-radius:12px;font-weight:600">DISPONIBLE</span>
        </div>`;
        actualizarComisionPreview();
      };
      const actualizarComisionPreview = () => {
        const precio = +document.getElementById('precioVenta').value || 0;
        const pct = +document.getElementById('pctComision').value || 0;
        const prev = document.getElementById('comisionPreview');
        if (!precio || !pct) { prev.innerHTML = ''; return; }
        const bruto = precio * pct / 100;
        const impuesto = bruto * 0.13;
        const neto = bruto - impuesto;
        prev.innerHTML = `<div style="background:#fef9e7;border:1px solid #d4a017;border-radius:8px;padding:10px 14px;font-size:12px;color:#8a6d15;display:flex;gap:16px;align-items:center">
          <span style="font-weight:600">Comisión estimada:</span>
          <span>Bruto: $${bruto.toFixed(2)}</span>
          <span>IT 13%: -$${impuesto.toFixed(2)}</span>
          <span style="font-weight:700;color:#2d5a1e">Neto: $${neto.toFixed(2)}</span>
        </div>`;
      };
      document.getElementById('precioVenta').addEventListener('input', actualizarComisionPreview);
      document.getElementById('pctComision').addEventListener('input', actualizarComisionPreview);
      document.getElementById('btnAddClienteRapido').addEventListener('click', () => {
        const is = inputStyle, ls = labelStyle, fg = fgStyle, rw = rowStyle, bs = btnStyle;
        const subModal = document.createElement('div');
        subModal.style = 'position:absolute;inset:0;background:rgba(26,14,4,.3);z-index:10;display:flex;align-items:center;justify-content:center;';
        subModal.innerHTML = `<div style="background:white;border-radius:14px;padding:24px;max-width:420px;width:100%;box-shadow:0 8px 30px rgba(0,0,0,.15)">
          <div style="font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:var(--bark);margin-bottom:16px">Nuevo cliente</div>
          <form id="frmClienteRapido">
            <div style="${rw}">
              <div style="${fg}"><label style="${ls}">Nombre</label><input style="${is}" name="nombre" required></div>
              <div style="${fg}"><label style="${ls}">Apellido</label><input style="${is}" name="apellido" required></div>
            </div>
            <div style="${rw}">
              <div style="${fg}"><label style="${ls}">CI</label><input style="${is}" name="ci" required></div>
              <div style="${fg}"><label style="${ls}">Teléfono</label><input style="${is}" name="telefono" placeholder="+591 7..."></div>
            </div>
            <div style="${fg}"><label style="${ls}">Email</label><input style="${is}" name="email" type="email"></div>
            <div style="${rw}">
              <div style="${fg}"><label style="${ls}">Ciudad</label><input style="${is}" name="ciudad" value="Cochabamba"></div>
              <div style="${fg}"><label style="${ls}">Dirección</label><input style="${is}" name="direccion"></div>
            </div>
            <div style="display:flex;gap:8px;margin-top:12px">
              <button type="button" id="btnCancelClienteR" style="flex:1;background:var(--off);border:1px solid var(--border);border-radius:10px;padding:12px;font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif;">Cancelar</button>
              <button type="submit" style="flex:1;${bs}">Crear cliente</button>
            </div>
          </form>
        </div>`;
        body.style.position = 'relative';
        body.appendChild(subModal);
        document.getElementById('btnCancelClienteR').onclick = () => subModal.remove();
        document.getElementById('frmClienteRapido').onsubmit = async (ev) => {
          ev.preventDefault();
          const fd = new FormData(ev.target);
          const data = { nombre: fd.get('nombre'), apellido: fd.get('apellido'), ci: fd.get('ci'), telefono: fd.get('telefono')||undefined, email: fd.get('email')||undefined, ciudad: fd.get('ciudad')||undefined, direccion: fd.get('direccion')||undefined };
          try {
            showLoading('Creando cliente...');
            const nuevo = await clientesApi.create(data);
            hideLoading(); toast('Cliente creado', 'ok');
            subModal.remove();
            const selC = document.getElementById('selClienteVenta');
            const opt = document.createElement('option');
            opt.value = nuevo.id; opt.textContent = `${nuevo.nombre} ${nuevo.apellido} — ${nuevo.ci||''}`;
            opt.selected = true;
            selC.appendChild(opt);
          } catch(err) { hideLoading(); toast('Error: '+err.message, 'err'); }
        };
      });
      document.getElementById('frmGlobal').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          showLoading('Registrando venta...');
          await ventasApi.create({ clienteId: fd.get('clienteId'), unidadId: fd.get('unidadId'), precioFinal: +fd.get('precioFinal'), totalCuotas: +fd.get('totalCuotas'), fechaVenta: fd.get('fechaVenta'), vendedorId: fd.get('vendedorId'), porcentajeComision: +fd.get('porcentajeComision')||undefined, observacion: fd.get('observacion')||undefined });
          hideLoading(); toast('Venta registrada', 'ok'); modal.classList.remove('open'); window.navigateTo('ventas');
        } catch(err) { hideLoading(); toast('Error: '+err.message, 'err'); }
      };
    },

    rrhh: async () => {
      title.textContent = 'Nuevo empleado';
      const proyectos = await proyectosApi.list();
      body.innerHTML = `<form id="frmGlobal">
        <div style="${rowStyle}">
          <div style="${fgStyle}"><label style="${labelStyle}">Nombre</label><input style="${inputStyle}" name="nombre" required></div>
          <div style="${fgStyle}"><label style="${labelStyle}">Apellido</label><input style="${inputStyle}" name="apellido" required></div>
        </div>
        <div style="${rowStyle}">
          <div style="${fgStyle}"><label style="${labelStyle}">CI</label><input style="${inputStyle}" name="ci" required></div>
          <div style="${fgStyle}"><label style="${labelStyle}">Cargo</label><input style="${inputStyle}" name="cargo" placeholder="Albañil, Electricista..." required></div>
        </div>
        <div style="${rowStyle}">
          <div style="${fgStyle}"><label style="${labelStyle}">Especialidad</label><input style="${inputStyle}" name="especialidad" placeholder="Estructura, Acabados..."></div>
          <div style="${fgStyle}"><label style="${labelStyle}">Teléfono</label><input style="${inputStyle}" name="telefono" placeholder="+591 70012345"></div>
        </div>
        <div style="${fgStyle}"><label style="${labelStyle}">Email</label><input style="${inputStyle}" name="email" type="email" placeholder="empleado@email.com"></div>
        <div style="${rowStyle}">
          <div style="${fgStyle}"><label style="${labelStyle}">Salario base Bs</label><input style="${inputStyle}" name="salarioBase" type="number" step="0.01" required></div>
          <div style="${fgStyle}"><label style="${labelStyle}">Tipo contrato</label><select style="${inputStyle}" name="tipoContrato" required><option value="POR_OBRA">Por obra</option><option value="A_PLAZO_FIJO">A plazo fijo</option><option value="INDEFINIDO">Indefinido</option></select></div>
        </div>
        <div style="${rowStyle}">
          <div style="${fgStyle}"><label style="${labelStyle}">Fecha ingreso</label><input style="${inputStyle}" name="fechaIngreso" type="date" value="${new Date().toISOString().slice(0,10)}" required></div>
          <div style="${fgStyle}"><label style="${labelStyle}">Proyecto</label><select style="${inputStyle}" name="proyectoId"><option value="">Sin asignar</option>${proyectos.map(p=>`<option value="${p.id}">${p.nombre}</option>`).join('')}</select></div>
        </div>
        <button type="submit" style="${btnStyle}">Crear empleado</button>
      </form>`;
      document.getElementById('frmGlobal').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          showLoading('Creando empleado...');
          await empleadosApi.create({ nombre: fd.get('nombre'), apellido: fd.get('apellido'), ci: fd.get('ci'), cargo: fd.get('cargo'), especialidad: fd.get('especialidad')||undefined, telefono: fd.get('telefono')||undefined, email: fd.get('email')||undefined, salarioBase: +fd.get('salarioBase'), tipoContrato: fd.get('tipoContrato'), fechaIngreso: fd.get('fechaIngreso'), proyectoId: fd.get('proyectoId')||undefined });
          hideLoading(); toast('Empleado creado', 'ok'); modal.classList.remove('open'); window.navigateTo('rrhh');
        } catch(err) { hideLoading(); toast('Error: '+err.message, 'err'); }
      };
    },

    costos: async () => {
      title.textContent = 'Registrar gasto';
      const proyectos = await proyectosApi.list();
      body.innerHTML = `<form id="frmGlobal">
        <div style="${fgStyle}"><label style="${labelStyle}">Proyecto</label><select style="${inputStyle}" name="proyectoId" required><option value="">Seleccionar...</option>${proyectos.map(p=>`<option value="${p.id}">${p.nombre}</option>`).join('')}</select></div>
        <div style="${fgStyle}"><label style="${labelStyle}">Descripción</label><input style="${inputStyle}" name="descripcion" placeholder="Compra de cemento, mano de obra..." required></div>
        <div style="${rowStyle}">
          <div style="${fgStyle}"><label style="${labelStyle}">Categoría</label><select style="${inputStyle}" name="categoria" required><option value="Materiales">Materiales</option><option value="Mano de obra">Mano de obra</option><option value="Equipamiento">Equipamiento</option><option value="Gastos adm.">Gastos administrativos</option><option value="Marketing">Marketing</option><option value="Otros">Otros</option></select></div>
          <div style="${fgStyle}"><label style="${labelStyle}">Tipo</label><select style="${inputStyle}" name="tipo"><option value="Directo">Directo</option><option value="Indirecto">Indirecto</option></select></div>
        </div>
        <div style="${rowStyle}">
          <div style="${fgStyle}"><label style="${labelStyle}">Monto USD</label><input style="${inputStyle}" name="montoUSD" type="number" step="0.01" required></div>
          <div style="${fgStyle}"><label style="${labelStyle}">Fecha</label><input style="${inputStyle}" name="fecha" type="date" value="${new Date().toISOString().slice(0,10)}" required></div>
        </div>
        <div style="${fgStyle}"><label style="${labelStyle}">N° factura (opcional)</label><input style="${inputStyle}" name="factura" placeholder="FAC-00123"></div>
        <button type="submit" style="${btnStyle}">Registrar gasto</button>
      </form>`;
      document.getElementById('frmGlobal').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          showLoading('Registrando gasto...');
          await gastosApi.create({ proyectoId: fd.get('proyectoId'), descripcion: fd.get('descripcion'), categoria: fd.get('categoria'), tipo: fd.get('tipo'), montoUSD: +fd.get('montoUSD'), fecha: fd.get('fecha'), factura: fd.get('factura')||undefined });
          hideLoading(); toast('Gasto registrado', 'ok'); modal.classList.remove('open'); window.navigateTo('costos');
        } catch(err) { hideLoading(); toast('Error: '+err.message, 'err'); }
      };
    },

    finanzas: async () => {
      title.textContent = 'Registrar movimiento';
      body.innerHTML = `<form id="frmGlobal">
        <div style="${rowStyle}">
          <div style="${fgStyle}"><label style="${labelStyle}">Tipo</label><select style="${inputStyle}" name="tipo" required><option value="INGRESO">Ingreso</option><option value="EGRESO">Egreso</option></select></div>
          <div style="${fgStyle}"><label style="${labelStyle}">Categoría</label><select style="${inputStyle}" name="categoria" required><option value="Pago de cuota">Pago de cuota</option><option value="Reserva">Reserva</option><option value="Nómina">Nómina</option><option value="Materiales">Materiales</option><option value="Equipamiento">Equipamiento</option><option value="Gastos adm.">Gastos adm.</option><option value="Otros">Otros</option></select></div>
        </div>
        <div style="${fgStyle}"><label style="${labelStyle}">Concepto</label><input style="${inputStyle}" name="concepto" placeholder="Pago cuota cliente, compra materiales..." required></div>
        <div style="${rowStyle}">
          <div style="${fgStyle}"><label style="${labelStyle}">Monto USD</label><input style="${inputStyle}" name="montoUSD" type="number" step="0.01" required></div>
          <div style="${fgStyle}"><label style="${labelStyle}">Método</label><select style="${inputStyle}" name="metodo"><option value="Transferencia">Transferencia</option><option value="Depósito">Depósito</option><option value="Efectivo">Efectivo</option><option value="Cheque">Cheque</option></select></div>
        </div>
        <div style="${rowStyle}">
          <div style="${fgStyle}"><label style="${labelStyle}">Fecha</label><input style="${inputStyle}" name="fecha" type="date" value="${new Date().toISOString().slice(0,10)}" required></div>
          <div style="${fgStyle}"><label style="${labelStyle}">Referencia (opcional)</label><input style="${inputStyle}" name="referencia" placeholder="N° transacción"></div>
        </div>
        <button type="submit" style="${btnStyle}">Registrar movimiento</button>
      </form>`;
      document.getElementById('frmGlobal').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          showLoading('Registrando...');
          await finanzasApi.crear({ tipo: fd.get('tipo'), concepto: fd.get('concepto'), categoria: fd.get('categoria'), montoUSD: +fd.get('montoUSD'), metodo: fd.get('metodo'), fecha: fd.get('fecha'), referencia: fd.get('referencia')||undefined });
          hideLoading(); toast('Movimiento registrado', 'ok'); modal.classList.remove('open'); window.navigateTo('finanzas');
        } catch(err) { hideLoading(); toast('Error: '+err.message, 'err'); }
      };
    },

    legal: async () => {
      title.textContent = 'Nuevo contrato';
      const [clientes, proyectos] = await Promise.all([clientesApi.list(), proyectosApi.list()]);
      body.innerHTML = `<form id="frmGlobal">
        <div style="${rowStyle}">
          <div style="${fgStyle}"><label style="${labelStyle}">Cliente</label><select style="${inputStyle}" name="clienteId" required><option value="">Seleccionar...</option>${clientes.map(c=>`<option value="${c.id}">${c.nombre} ${c.apellido}</option>`).join('')}</select></div>
          <div style="${fgStyle}"><label style="${labelStyle}">Proyecto</label><select style="${inputStyle}" name="proyectoId" required><option value="">Seleccionar...</option>${proyectos.map(p=>`<option value="${p.id}">${p.nombre}</option>`).join('')}</select></div>
        </div>
        <div style="${rowStyle}">
          <div style="${fgStyle}"><label style="${labelStyle}">Tipo</label><select style="${inputStyle}" name="tipo"><option value="Compraventa">Compraventa</option><option value="Promesa">Promesa</option></select></div>
          <div style="${fgStyle}"><label style="${labelStyle}">Monto USD</label><input style="${inputStyle}" name="monto" type="number" step="0.01" required></div>
        </div>
        <div style="${rowStyle}">
          <div style="${fgStyle}"><label style="${labelStyle}">Notaría</label><input style="${inputStyle}" name="notaria" placeholder="Notaría N° 12"></div>
          <div style="${fgStyle}"><label style="${labelStyle}">Fecha emisión</label><input style="${inputStyle}" name="fechaEmision" type="date" value="${new Date().toISOString().slice(0,10)}" required></div>
        </div>
        <button type="submit" style="${btnStyle}">Crear contrato</button>
      </form>`;
      document.getElementById('frmGlobal').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          showLoading('Creando contrato...');
          await contratosApi.create({ clienteId: fd.get('clienteId'), proyectoId: fd.get('proyectoId'), tipo: fd.get('tipo'), monto: +fd.get('monto'), notaria: fd.get('notaria')||undefined, fechaEmision: fd.get('fechaEmision') });
          hideLoading(); toast('Contrato creado', 'ok'); modal.classList.remove('open'); window.navigateTo('legal');
        } catch(err) { hideLoading(); toast('Error: '+err.message, 'err'); }
      };
    },

    marketing: async () => {
      title.textContent = 'Nueva campaña';
      const proyectos = await proyectosApi.list();
      body.innerHTML = `<form id="frmGlobal">
        <div style="${fgStyle}"><label style="${labelStyle}">Nombre</label><input style="${inputStyle}" name="nombre" placeholder="Campaña Facebook Ads - Torre II" required></div>
        <div style="${rowStyle}">
          <div style="${fgStyle}"><label style="${labelStyle}">Canal</label><select style="${inputStyle}" name="canal" required><option value="FACEBOOK_ADS">Facebook Ads</option><option value="INSTAGRAM">Instagram</option><option value="GOOGLE_ADS">Google Ads</option><option value="WHATSAPP">WhatsApp</option><option value="REFERIDOS">Referidos</option><option value="WEB">Web</option><option value="OTRO">Otro</option></select></div>
          <div style="${fgStyle}"><label style="${labelStyle}">Proyecto</label><select style="${inputStyle}" name="proyectoId"><option value="">General</option>${proyectos.map(p=>`<option value="${p.id}">${p.nombre}</option>`).join('')}</select></div>
        </div>
        <div style="${fgStyle}"><label style="${labelStyle}">Objetivo</label><input style="${inputStyle}" name="objetivo" placeholder="Generación de leads, reconocimiento..." required></div>
        <div style="${rowStyle}">
          <div style="${fgStyle}"><label style="${labelStyle}">Presupuesto USD</label><input style="${inputStyle}" name="presupuesto" type="number" step="0.01" required></div>
          <div style="${fgStyle}"><label style="${labelStyle}">Meta leads</label><input style="${inputStyle}" name="metaLeads" type="number" value="0"></div>
        </div>
        <div style="${fgStyle}"><label style="${labelStyle}">Fecha inicio</label><input style="${inputStyle}" name="fechaInicio" type="date" value="${new Date().toISOString().slice(0,10)}" required></div>
        <button type="submit" style="${btnStyle}">Crear campaña</button>
      </form>`;
      document.getElementById('frmGlobal').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          showLoading('Creando campaña...');
          await campanasApi.create({ nombre: fd.get('nombre'), canal: fd.get('canal'), proyectoId: fd.get('proyectoId')||undefined, objetivo: fd.get('objetivo'), presupuesto: +fd.get('presupuesto'), metaLeads: +fd.get('metaLeads'), fechaInicio: fd.get('fechaInicio') });
          hideLoading(); toast('Campaña creada', 'ok'); modal.classList.remove('open'); window.navigateTo('marketing');
        } catch(err) { hideLoading(); toast('Error: '+err.message, 'err'); }
      };
    },

    compras: async () => {
      title.textContent = 'Nueva orden de compra';
      const [proyectos, proveedores] = await Promise.all([proyectosApi.list(), (await import('./api/index.js')).proveedoresApi.list()]);
      body.innerHTML = `<form id="frmGlobal">
        <div style="${rowStyle}">
          <div style="${fgStyle}"><label style="${labelStyle}">Proveedor</label><select style="${inputStyle}" name="proveedorId" required><option value="">Seleccionar...</option>${proveedores.map(p=>`<option value="${p.id}">${p.nombre}</option>`).join('')}</select></div>
          <div style="${fgStyle}"><label style="${labelStyle}">Proyecto</label><select style="${inputStyle}" name="proyectoId" required><option value="">Seleccionar...</option>${proyectos.map(p=>`<option value="${p.id}">${p.nombre}</option>`).join('')}</select></div>
        </div>
        <div style="${fgStyle}"><label style="${labelStyle}">Descripción del item</label><input style="${inputStyle}" name="descripcion" placeholder="Cemento Portland x 50 bolsas" required></div>
        <div style="${rowStyle}">
          <div style="${fgStyle}"><label style="${labelStyle}">Cantidad</label><input style="${inputStyle}" name="cantidad" type="number" step="0.01" required></div>
          <div style="${fgStyle}"><label style="${labelStyle}">Precio unitario USD</label><input style="${inputStyle}" name="precioUnit" type="number" step="0.01" required></div>
        </div>
        <div style="${fgStyle}"><label style="${labelStyle}">Fecha emisión</label><input style="${inputStyle}" name="fechaEmision" type="date" value="${new Date().toISOString().slice(0,10)}" required></div>
        <button type="submit" style="${btnStyle}">Crear orden</button>
      </form>`;
      document.getElementById('frmGlobal').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const cant = +fd.get('cantidad'), pu = +fd.get('precioUnit'), sub = cant*pu, iva = sub*0.13, total = sub+iva;
        try {
          showLoading('Creando orden...');
          await (await import('./api/index.js')).ordenesApi.create({ proveedorId: fd.get('proveedorId'), proyectoId: fd.get('proyectoId'), fechaEmision: fd.get('fechaEmision'), subtotal: sub, iva, total, items: [{ descripcion: fd.get('descripcion'), unidad: 'unidad', cantidad: cant, precioUnit: pu, total: cant*pu }] });
          hideLoading(); toast('Orden creada', 'ok'); modal.classList.remove('open'); window.navigateTo('compras');
        } catch(err) { hideLoading(); toast('Error: '+err.message, 'err'); }
      };
    },

    reportes: () => { title.textContent = 'Exportar reportes'; body.innerHTML = `<p style="color:var(--text-muted);font-size:12.5px">Usa los botones de descarga en la sección de reportes para generar PDF y Excel.</p>`; },
  };

  const formFn = forms[_currentModule] || forms.dashboard;
  await formFn();
  modal.classList.add('open');
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
