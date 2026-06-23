// src/pages/ventas.js — Módulo Ventas conectado al backend

import { ventasApi, clientesApi, proyectosApi, unidadesApi } from '../api/index.js';
import { fmt, estadoPill, toast, showLoading, hideLoading, renderTable, renderPagination, confirm, debounce } from '../utils/ui.js';

let _pagina = 1;
let _filtros = {};
let _proyectos = [];
let _subTab = 'resumen';

export async function initVentas(container) {
  container.innerHTML = `
    <div class="tabs" id="ventas-tabs">
      <div class="tab active" data-tab="resumen">Resumen</div>
      <div class="tab" data-tab="registro">Registro ventas</div>
      <div class="tab" data-tab="clientes">Clientes</div>
      <div class="tab" data-tab="pagos">Pagos y cuotas</div>
      <div class="tab" data-tab="comisiones">Comisiones</div>
    </div>
    <div id="ventas-content" style="padding:0 24px 24px"></div>
  `;

  // Tab navigation
  container.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      _subTab = tab.dataset.tab;
      _pagina = 1;
      renderSubTab(container.querySelector('#ventas-content'));
    });
  });

  // Cargar proyectos para filtros
  try { _proyectos = await proyectosApi.list(); } catch {}

  await renderSubTab(container.querySelector('#ventas-content'));
}

async function renderSubTab(el) {
  switch (_subTab) {
    case 'resumen':    return renderResumen(el);
    case 'registro':   return renderRegistro(el);
    case 'clientes':   return renderClientes(el);
    case 'pagos':      return renderPagos(el);
    case 'comisiones': return renderComisiones(el);
  }
}

// ── RESUMEN ──
async function renderResumen(el) {
  try {
    showLoading();
    const [resumen, ventasData] = await Promise.all([
      ventasApi.resumen(),
      ventasApi.list({ limit: 8 })
    ]);
    hideLoading();

    el.innerHTML = `
      <div class="kpi-row" style="margin-top:20px">
        <div class="kpi">
          <div class="kpi-top"><div class="ki g"><svg viewBox="0 0 24 24"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/></svg></div><div class="trend up">↑ Este mes</div></div>
          <div class="kpi-val">${resumen.ventasMes}</div><div class="kpi-lbl">Ventas este mes</div>
        </div>
        <div class="kpi">
          <div class="kpi-top"><div class="ki b"><svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div><div class="trend up">↑ Acumulado</div></div>
          <div class="kpi-val">${fmt.usd(resumen.totalVendido)}</div><div class="kpi-lbl">Monto total vendido</div>
        </div>
        <div class="kpi">
          <div class="kpi-top"><div class="ki gold"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div><div class="trend fl">Comisiones</div></div>
          <div class="kpi-val">${fmt.usd(resumen.comisiones)}</div><div class="kpi-lbl">Comisiones generadas</div>
        </div>
        <div class="kpi">
          <div class="kpi-top"><div class="ki r"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="trend dn">Pendiente</div></div>
          <div class="kpi-val">${fmt.usd(resumen.saldoPendiente)}</div><div class="kpi-lbl">Saldo pendiente cobro</div>
        </div>
      </div>

      <div class="panel">
        <div class="ph"><div><div class="pt">Últimas ventas registradas</div><div class="ps">Ventas recientes del sistema</div></div>
          <button class="plink" onclick="">
            <svg style="width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nueva venta
          </button>
        </div>
        <div class="tw">
          <table>
            <thead><tr><th>#</th><th>Fecha</th><th>Cliente</th><th>Proyecto</th><th>Dpto</th><th class="r">Precio</th><th class="r">Saldo</th><th>Vendedor</th><th>Estado</th></tr></thead>
            <tbody>
              ${ventasData.ventas.map(v => `
                <tr>
                  <td style="font-size:11px;color:var(--text-muted)">${v.numero}</td>
                  <td>${fmt.fecha(v.fechaVenta)}</td>
                  <td><strong>${fmt.nombre(v.cliente)}</strong></td>
                  <td>${v.unidad?.proyecto?.nombre || '—'}</td>
                  <td>${v.unidad?.codigo || '—'}</td>
                  <td class="r" style="color:var(--leaf);font-weight:500">${fmt.usd(v.precioFinal)}</td>
                  <td class="r" style="color:${v.saldoPendiente>0?'var(--red)':'var(--leaf)'};font-weight:500">${fmt.usd(v.saldoPendiente)}</td>
                  <td>${v.vendedor?.nombre || '—'}</td>
                  <td>${estadoPill(v.estado)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    hideLoading();
    toast('Error al cargar resumen: ' + err.message, 'err');
  }
}

// ── REGISTRO VENTAS ──
async function renderRegistro(el) {
  el.innerHTML = `
    <div class="search-row" style="margin-top:20px">
      <div class="search-box">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="buscarVenta" placeholder="Buscar por cliente, proyecto...">
      </div>
      <select class="sel" id="filtroProyecto">
        <option value="">Todos los proyectos</option>
        ${_proyectos.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('')}
      </select>
      <select class="sel" id="filtroEstado">
        <option value="">Todos los estados</option>
        <option value="AL_DIA">Al día</option>
        <option value="PROXIMO_VENCER">Próximo a vencer</option>
        <option value="VENCIDO">Vencido</option>
      </select>
      <button class="filter-btn" id="btnExportVentas">
        <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Excel
      </button>
    </div>
    <div class="panel">
      <div id="tablaVentas"></div>
      <div id="paginaVentas"></div>
    </div>
  `;

  const buscar   = document.getElementById('buscarVenta');
  const filtProy = document.getElementById('filtroProyecto');
  const filtEst  = document.getElementById('filtroEstado');
  const btnExp   = document.getElementById('btnExportVentas');

  const cargar = async () => {
    const params = { page: _pagina, limit: 15 };
    if (filtProy.value) params.proyectoId = filtProy.value;
    if (filtEst.value)  params.estado     = filtEst.value;
    try {
      const data = await ventasApi.list(params);
      renderTablaVentas(data.ventas);
      renderPagination(
        document.getElementById('paginaVentas'),
        data.total, _pagina, 15,
        (p) => { _pagina = p; cargar(); }
      );
    } catch (err) { toast('Error: ' + err.message, 'err'); }
  };

  buscar.addEventListener('input', debounce(cargar, 400));
  filtProy.addEventListener('change', () => { _pagina = 1; cargar(); });
  filtEst.addEventListener('change',  () => { _pagina = 1; cargar(); });
  btnExp.addEventListener('click', async () => {
    try {
      const { reportesApi } = await import('../api/index.js');
      await reportesApi.descargarVentas({});
      toast('Excel descargado', 'ok');
    } catch (err) { toast('Error al descargar: ' + err.message, 'err'); }
  });

  cargar();
}

function renderTablaVentas(ventas) {
  renderTable(
    document.getElementById('tablaVentas'),
    [
      { header: '#',        key: 'numero',  render: v => `<span style="font-size:11px;color:var(--text-muted)">${v.numero}</span>` },
      { header: 'Fecha',    render: v => fmt.fecha(v.fechaVenta) },
      { header: 'Cliente',  render: v => `<strong>${fmt.nombre(v.cliente)}</strong>` },
      { header: 'Proyecto', render: v => v.unidad?.proyecto?.nombre || '—' },
      { header: 'Dpto.',    render: v => v.unidad?.codigo || '—' },
      { header: 'm²',       render: v => v.unidad?.m2 || '—' },
      { header: 'Precio',   align: 'right', render: v => `<span style="color:var(--leaf);font-weight:500">${fmt.usd(v.precioFinal)}</span>` },
      { header: 'Saldo',    align: 'right', render: v => `<span style="color:${v.saldoPendiente>0?'var(--red)':'var(--leaf)'};font-weight:500">${fmt.usd(v.saldoPendiente)}</span>` },
      { header: 'Vendedor', render: v => v.vendedor?.nombre || '—' },
      { header: 'Estado',   render: v => estadoPill(v.estado) },
      { header: '',         render: v => `<button onclick="verCuotas('${v.id}')" class="plink">Cuotas</button>` },
    ],
    ventas,
    'Sin ventas registradas'
  );
}

// ── CLIENTES ──
async function renderClientes(el) {
  el.innerHTML = `
    <div class="search-row" style="margin-top:20px">
      <div class="search-box">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="buscarCliente" placeholder="Buscar por nombre, CI...">
      </div>
      <button class="btn-pri" id="btnNuevoCliente" style="height:36px">
        <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Nuevo cliente
      </button>
    </div>
    <div class="panel"><div id="tablaClientes"></div><div id="paginaClientes"></div></div>
  `;

  const cargar = async (q = '') => {
    try {
      const raw = await clientesApi.list({ q });
      const clientes = Array.isArray(raw) ? raw : (raw.clientes || []);
      renderTable(
        document.getElementById('tablaClientes'),
        [
          { header: 'Cliente',  render: c => `<strong>${fmt.nombre(c)}</strong>` },
          { header: 'CI',       key: 'ci' },
          { header: 'Teléfono', key: 'telefono' },
          { header: 'Email',    key: 'email', render: c => c.email || '—' },
          { header: 'Ventas',   render: c => c.ventas?.length || 0 },
          { header: '',         render: c => `<button onclick="verCliente('${c.id}')" class="plink">Ver</button>` },
        ],
        clientes,
        'Sin clientes registrados'
      );
      renderPagination(document.getElementById('paginaClientes'), clientes.length, _pagina, 15, p => { _pagina=p; cargar(document.getElementById('buscarCliente').value); });
    } catch (err) { toast('Error: ' + err.message, 'err'); }
  };

  document.getElementById('buscarCliente').addEventListener('input', debounce(e => { _pagina=1; cargar(e.target.value); }, 350));
  document.getElementById('btnNuevoCliente').addEventListener('click', () => mostrarModalCliente());
  cargar();
}

// ── PAGOS Y CUOTAS ──
async function renderPagos(el) {
  el.innerHTML = `
    <div class="search-row" style="margin-top:20px">
      <select class="sel" id="filtroEstadoCuota">
        <option value="">Todas</option>
        <option value="false">Pendientes</option>
        <option value="true">Pagadas</option>
      </select>
      <select class="sel" id="filtroVencidas">
        <option value="">Todas las fechas</option>
        <option value="true">Solo vencidas</option>
      </select>
    </div>
    <div class="panel"><div id="tablaCuotas"></div></div>
  `;

  const cargar = async () => {
    try {
      const pagado   = document.getElementById('filtroEstadoCuota').value;
      const vencidas = document.getElementById('filtroVencidas').value;
      const params   = {};
      if (pagado !== '')   params.pagado   = pagado;
      if (vencidas === 'true') params.vencidas = 'true';
      const cuotas = await import('../api/index.js').then(m => m.cuotasApi.list(params));
      renderTable(
        document.getElementById('tablaCuotas'),
        [
          { header: 'Cliente',    render: c => `<strong>${fmt.nombre(c.venta?.cliente)}</strong>` },
          { header: 'Proyecto',   render: c => c.venta?.unidad?.proyecto?.nombre || '—' },
          { header: 'Cuota',      render: c => `${c.numero}/${c.venta?.totalCuotas}` },
          { header: 'Vencimiento', render: c => fmt.fecha(c.vencimiento) },
          { header: 'Monto',      align: 'right', render: c => `<span style="font-weight:500">${fmt.usd(c.monto)}</span>` },
          { header: 'Estado',     render: c => c.pagado ? estadoPill('AL_DIA') : new Date(c.vencimiento)<new Date() ? estadoPill('VENCIDO') : estadoPill('PROXIMO_VENCER') },
          { header: '',           render: c => !c.pagado ? `<button onclick="pagarCuota('${c.id}')" class="plink">Pagar</button>` : '' },
        ],
        cuotas,
        'Sin cuotas'
      );
    } catch (err) { toast('Error: ' + err.message, 'err'); }
  };

  document.getElementById('filtroEstadoCuota').addEventListener('change', cargar);
  document.getElementById('filtroVencidas').addEventListener('change', cargar);
  cargar();
}

// ── COMISIONES ──
async function renderComisiones(el) {
  try {
    showLoading();
    const data = await import('../api/index.js').then(m => m.comisionesApi.resumenVendedor());
    hideLoading();
    el.innerHTML = `
      <div style="margin-top:20px" class="panel">
        <div class="ph"><div><div class="pt">Comisiones por vendedor — Mes actual</div></div></div>
        <div class="tw"><table>
          <thead><tr><th>Vendedor</th><th class="r">Ventas</th><th class="r">Monto vendido</th><th class="r">Comisión neta</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            ${data.map(d => `
              <tr>
                <td><strong>${fmt.nombre(d.vendedor)}</strong></td>
                <td class="r">${d.ventas}</td>
                <td class="r" style="color:var(--leaf);font-weight:500">${fmt.usd(d.montoBruto)}</td>
                <td class="r" style="color:var(--leaf);font-weight:600">${fmt.usd(d.montoNeto)}</td>
                <td>${d.comisiones.every(c=>c.estado==='PAGADA') ? estadoPill('PAGADA') : estadoPill('PENDIENTE')}</td>
                <td>
                  ${d.comisiones.some(c=>c.estado!=='PAGADA') ? `<button onclick="pagarComisionVendedor('${d.vendedor.id}')" class="plink">Pagar</button>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table></div>
      </div>
    `;
  } catch (err) {
    hideLoading();
    toast('Error: ' + err.message, 'err');
  }
}

// ── MODAL NUEVO CLIENTE ──
function mostrarModalCliente(cliente = null) {
  const modal = document.createElement('div');
  modal.className = 'modal-bg open';
  modal.innerHTML = `
    <div class="modal">
      <div class="mhd">
        <div class="mtitle">${cliente ? 'Editar cliente' : 'Nuevo cliente'}</div>
        <button class="mclose" onclick="this.closest('.modal-bg').remove()">
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="mbody">
        <div class="fgrid">
          <div class="fg"><label>Nombre</label><input id="cl-nombre" type="text" value="${cliente?.nombre||''}" placeholder="Nombre"></div>
          <div class="fg"><label>Apellido</label><input id="cl-apellido" type="text" value="${cliente?.apellido||''}" placeholder="Apellido"></div>
          <div class="fg"><label>CI</label><input id="cl-ci" type="text" value="${cliente?.ci||''}" placeholder="Cédula de identidad"></div>
          <div class="fg"><label>Teléfono</label><input id="cl-tel" type="text" value="${cliente?.telefono||''}" placeholder="+591 7..."></div>
          <div class="fg"><label>Email</label><input id="cl-email" type="email" value="${cliente?.email||''}" placeholder="correo@email.com"></div>
          <div class="fg"><label>Ciudad</label><input id="cl-ciudad" type="text" value="${cliente?.ciudad||'Cochabamba'}" placeholder="Cochabamba"></div>
          <div class="fg full"><label>Dirección</label><input id="cl-dir" type="text" value="${cliente?.direccion||''}" placeholder="Dirección"></div>
        </div>
      </div>
      <div class="mfoot">
        <button class="btn-sec" onclick="this.closest('.modal-bg').remove()">Cancelar</button>
        <button class="btn-pri" id="btnGuardarCliente">
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          Guardar
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });

  document.getElementById('btnGuardarCliente').addEventListener('click', async () => {
    const data = {
      nombre:    document.getElementById('cl-nombre').value.trim(),
      apellido:  document.getElementById('cl-apellido').value.trim(),
      ci:        document.getElementById('cl-ci').value.trim(),
      telefono:  document.getElementById('cl-tel').value.trim(),
      email:     document.getElementById('cl-email').value.trim() || null,
      ciudad:    document.getElementById('cl-ciudad').value.trim(),
      direccion: document.getElementById('cl-dir').value.trim() || null,
    };
    if (!data.nombre || !data.ci) { toast('Nombre y CI son obligatorios', 'warn'); return; }
    try {
      if (cliente) {
        await clientesApi.update(cliente.id, data);
        toast('Cliente actualizado', 'ok');
      } else {
        await clientesApi.create(data);
        toast('Cliente registrado', 'ok');
      }
      modal.remove();
      renderClientes(document.getElementById('ventas-content'));
    } catch (err) { toast('Error: ' + err.message, 'err'); }
  });
}

// ── PAGAR CUOTA (global) ──
window.pagarCuota = async function(cuotaId) {
  const ok = await confirm('¿Confirmar el pago de esta cuota?', 'Registrar pago');
  if (!ok) return;
  try {
    const { cuotasApi } = await import('../api/index.js');
    await cuotasApi.pagar(cuotaId, { metodoPago: 'Transferencia' });
    toast('Pago registrado correctamente', 'ok');
    renderPagos(document.getElementById('ventas-content'));
  } catch (err) { toast('Error: ' + err.message, 'err'); }
};
