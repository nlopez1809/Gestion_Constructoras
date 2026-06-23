// src/pages/rrhh.js — Recursos Humanos conectado al backend
import { empleadosApi, asistenciaApi, planillaApi } from '../api/index.js';
import { fmt, estadoPill, toast, showLoading, hideLoading, renderTable, confirm } from '../utils/ui.js';

export async function initRRHH(container) {
  container.innerHTML = `
    <div class="tabs">
      <div class="tab active" data-tab="resumen">Resumen</div>
      <div class="tab" data-tab="empleados">Empleados</div>
      <div class="tab" data-tab="asistencia">Asistencia</div>
      <div class="tab" data-tab="planilla">Planilla</div>
      <div class="tab" data-tab="comisiones">Comisiones</div>
    </div>
    <div id="rrhh-content" style="padding:0 24px 24px"></div>
  `;
  container.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderRRHHTab(container.querySelector('#rrhh-content'), tab.dataset.tab);
    });
  });
  renderRRHHTab(container.querySelector('#rrhh-content'), 'resumen');
}

async function renderRRHHTab(el, tab) {
  switch(tab) {
    case 'resumen':    return renderResumenRRHH(el);
    case 'empleados':  return renderEmpleados(el);
    case 'asistencia': return renderAsistencia(el);
    case 'planilla':   return renderPlanilla(el);
    case 'comisiones': return renderComisionesRRHH(el);
  }
}

async function renderResumenRRHH(el) {
  try {
    showLoading();
    const [empleados, resumenMes] = await Promise.all([
      empleadosApi.list(),
      asistenciaApi.resumenMes({ periodo: new Date().toISOString().slice(0,7) })
    ]);
    hideLoading();
    const activos  = empleados.filter(e => e.estado === 'ACTIVO').length;
    const licencia = empleados.filter(e => e.estado === 'LICENCIA').length;
    const presentes = resumenMes.filter(e => e.pctAsistencia >= 90).length;

    el.innerHTML = `
      <div class="kpi-row" style="margin-top:20px">
        <div class="kpi"><div class="kpi-top"><div class="ki g"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div><div class="trend fl">Activos</div></div><div class="kpi-val">${activos}</div><div class="kpi-lbl">Empleados activos</div></div>
        <div class="kpi"><div class="kpi-top"><div class="ki gold"><svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div><div class="trend up">${Math.round((presentes/Math.max(activos,1))*100)}%</div></div><div class="kpi-val">${presentes}</div><div class="kpi-lbl">Asistencia correcta</div></div>
        <div class="kpi"><div class="kpi-top"><div class="ki warn"><svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg></div><div class="trend fl">Hoy</div></div><div class="kpi-val">${licencia}</div><div class="kpi-lbl">En licencia/vacación</div></div>
        <div class="kpi"><div class="kpi-top"><div class="ki b"><svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div><div class="trend fl">Mes actual</div></div><div class="kpi-val">${empleados.length}</div><div class="kpi-lbl">Total empleados</div></div>
      </div>
      <div class="emp-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
        ${empleados.slice(0,6).map(e => `
          <div style="background:var(--white);border:1px solid var(--border);border-radius:12px;padding:14px">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--bark-mid),var(--leaf));display:flex;align-items:center;justify-content:center;color:white;font-family:'Cormorant Garamond',serif;font-size:14px;font-weight:600;flex-shrink:0">${e.nombre[0]}${e.apellido[0]}</div>
              <div>
                <div style="font-size:13px;font-weight:500;color:var(--bark)">${fmt.nombre(e)}</div>
                <div style="font-size:11px;color:var(--text-muted)">${e.cargo}</div>
              </div>
              <div style="margin-left:auto">${estadoPill(e.estado)}</div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">
              <div><div style="font-size:9px;color:var(--text-muted);text-transform:uppercase">Salario</div><div style="font-size:12px;font-weight:500;color:var(--leaf)">${fmt.bs(e.salarioBase)}</div></div>
              <div><div style="font-size:9px;color:var(--text-muted);text-transform:uppercase">Ingreso</div><div style="font-size:12px;font-weight:500">${fmt.fecha(e.fechaIngreso)}</div></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch(err) { hideLoading(); toast('Error: '+err.message,'err'); }
}

async function renderEmpleados(el) {
  try {
    showLoading();
    const empleados = await empleadosApi.list();
    hideLoading();
    el.innerHTML = `
      <div class="search-row" style="margin-top:20px">
        <div class="search-box"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" placeholder="Buscar empleado..."></div>
        <button class="btn-pri" style="height:36px" id="btnNuevoEmp"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Nuevo empleado</button>
      </div>
      <div class="panel">
        <div class="tw"><table>
          <thead><tr><th>Empleado</th><th>CI</th><th>Cargo</th><th>Contrato</th><th>Ingreso</th><th class="r">Salario Bs</th><th>Estado</th></tr></thead>
          <tbody>
            ${empleados.map(e=>`
              <tr>
                <td><strong>${fmt.nombre(e)}</strong></td>
                <td>${e.ci}</td>
                <td>${e.cargo}</td>
                <td>${e.tipoContrato}</td>
                <td>${fmt.fecha(e.fechaIngreso)}</td>
                <td class="r" style="color:var(--leaf);font-weight:500">${fmt.bs(e.salarioBase)}</td>
                <td>${estadoPill(e.estado)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table></div>
      </div>
    `;

    document.getElementById('btnNuevoEmp').addEventListener('click', async () => {
      const modal = document.getElementById('globalModal');
      const title = document.getElementById('modal-title');
      const body  = document.getElementById('modal-body');
      if (!modal || !body) return;

      const { proyectosApi } = await import('../api/index.js');
      const proyectos = await proyectosApi.list();

      const is = 'width:100%;background:var(--off);border:1px solid var(--border);border-radius:8px;padding:9px 12px;font-size:13px;font-family:"DM Sans",sans-serif;color:var(--text);outline:none;';
      const ls = 'font-size:10px;font-weight:500;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;display:block;';
      const fg = 'margin-bottom:12px;';
      const rw = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;';
      const bs = 'width:100%;background:var(--bark);color:white;border:none;border-radius:10px;padding:12px;font-size:13px;font-weight:500;cursor:pointer;font-family:"DM Sans",sans-serif;margin-top:8px;';

      title.textContent = 'Nuevo empleado';
      body.innerHTML = `<form id="frmEmp">
        <div style="${rw}">
          <div style="${fg}"><label style="${ls}">Nombre</label><input style="${is}" name="nombre" required></div>
          <div style="${fg}"><label style="${ls}">Apellido</label><input style="${is}" name="apellido" required></div>
        </div>
        <div style="${rw}">
          <div style="${fg}"><label style="${ls}">CI</label><input style="${is}" name="ci" required></div>
          <div style="${fg}"><label style="${ls}">Cargo</label><input style="${is}" name="cargo" placeholder="Albañil, Electricista..." required></div>
        </div>
        <div style="${rw}">
          <div style="${fg}"><label style="${ls}">Especialidad</label><input style="${is}" name="especialidad" placeholder="Estructura, Acabados..."></div>
          <div style="${fg}"><label style="${ls}">Teléfono</label><input style="${is}" name="telefono" placeholder="+591 70012345"></div>
        </div>
        <div style="${fg}"><label style="${ls}">Email</label><input style="${is}" name="email" type="email"></div>
        <div style="${rw}">
          <div style="${fg}"><label style="${ls}">Salario base Bs</label><input style="${is}" name="salarioBase" type="number" step="0.01" required></div>
          <div style="${fg}"><label style="${ls}">Tipo contrato</label><select style="${is}" name="tipoContrato"><option value="POR_OBRA">Por obra</option><option value="A_PLAZO_FIJO">A plazo fijo</option><option value="INDEFINIDO">Indefinido</option></select></div>
        </div>
        <div style="${rw}">
          <div style="${fg}"><label style="${ls}">Fecha ingreso</label><input style="${is}" name="fechaIngreso" type="date" value="${new Date().toISOString().slice(0,10)}" required></div>
          <div style="${fg}"><label style="${ls}">Proyecto</label><select style="${is}" name="proyectoId"><option value="">Sin asignar</option>${proyectos.map(p=>`<option value="${p.id}">${p.nombre}</option>`).join('')}</select></div>
        </div>
        <button type="submit" style="${bs}">Crear empleado</button>
      </form>`;

      document.getElementById('frmEmp').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          showLoading('Creando empleado...');
          await empleadosApi.create({
            nombre: fd.get('nombre'), apellido: fd.get('apellido'), ci: fd.get('ci'),
            cargo: fd.get('cargo'), especialidad: fd.get('especialidad')||undefined,
            telefono: fd.get('telefono')||undefined, email: fd.get('email')||undefined,
            salarioBase: +fd.get('salarioBase'), tipoContrato: fd.get('tipoContrato'),
            fechaIngreso: fd.get('fechaIngreso'), proyectoId: fd.get('proyectoId')||undefined
          });
          hideLoading(); toast('Empleado creado', 'ok');
          modal.classList.remove('open');
          renderEmpleados(el);
        } catch(err) { hideLoading(); toast('Error: '+err.message, 'err'); }
      };
      modal.classList.add('open');
    });

  } catch(err) { hideLoading(); toast('Error: '+err.message,'err'); }
}

async function renderAsistencia(el) {
  try {
    showLoading();
    const data = await empleadosApi.asistenciaSemana();
    hideLoading();
    const dias = data.dias || [];
    const diasLabel = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    el.innerHTML = `
      <div style="margin-top:20px">
        <div class="panel">
          <div class="ph"><div><div class="pt">Control de asistencia semanal</div><div class="ps">${fmt.fecha(data.semanaInicio)} al ${fmt.fecha(dias[6])}</div></div></div>
          <div class="pb" style="overflow-x:auto">
            <div style="display:grid;grid-template-columns:160px repeat(7,1fr);gap:5px;min-width:600px">
              <div></div>
              ${dias.map((d,i)=>`<div style="text-align:center;font-size:9.5px;font-weight:500;color:var(--text-muted);text-transform:uppercase;padding-bottom:4px">${diasLabel[new Date(d).getDay()]} ${new Date(d).getDate()}</div>`).join('')}
              ${data.registros.map(r=>`
                <div style="font-size:12px;font-weight:500;color:var(--bark);padding:2px 4px">${fmt.nombre(r.empleado)}</div>
                ${r.dias.map(d=>`
                  <div style="height:26px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:500;cursor:pointer;
                    background:${d.estado==='PRESENTE'?'var(--leaf-pale)':d.estado==='FALTA'?'var(--red-bg)':d.estado==='LICENCIA'?'var(--warn-bg)':d.estado==='VACACION'?'var(--blue-bg)':'var(--off)'};
                    color:${d.estado==='PRESENTE'?'var(--leaf)':d.estado==='FALTA'?'var(--red)':d.estado==='LICENCIA'?'var(--gold)':d.estado==='VACACION'?'var(--blue)':'var(--border-dark)'}"
                  >${d.estado?d.estado[0]:'—'}</div>
                `).join('')}
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  } catch(err) { hideLoading(); toast('Error: '+err.message,'err'); }
}

async function renderPlanilla(el) {
  try {
    showLoading();
    const planillas = await empleadosApi.listarPlanillas();
    hideLoading();
    el.innerHTML = `
      <div style="margin-top:20px">
        <div class="search-row">
          <button class="btn-pri" id="btnGenerarPlanilla" style="height:36px">
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>Generar planilla del mes
          </button>
          <button class="filter-btn" id="btnExportPlanilla">
            <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Excel
          </button>
        </div>
        <div class="panel">
          <div class="tw"><table>
            <thead><tr><th>Período</th><th class="r">Bruto Bs</th><th class="r">AFP Bs</th><th class="r">RC-IVA Bs</th><th class="r">Neto Bs</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              ${planillas.map(p=>`
                <tr>
                  <td><strong>${p.periodo}</strong></td>
                  <td class="r">${fmt.bs(p.totalBruto)}</td>
                  <td class="r" style="color:var(--red)">${fmt.bs(p.totalAfp)}</td>
                  <td class="r" style="color:var(--red)">${fmt.bs(p.totalRcIva)}</td>
                  <td class="r" style="color:var(--leaf);font-weight:600">${fmt.bs(p.totalNeto)}</td>
                  <td>${estadoPill(p.estado)}</td>
                  <td>
                    ${p.estado==='PENDIENTE'?`<button class="plink" onclick="aprobarPlanilla('${p.id}')">Aprobar</button>`:''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table></div>
        </div>
      </div>
    `;
    document.getElementById('btnGenerarPlanilla').onclick = async () => {
      const periodo = new Date().toISOString().slice(0,7);
      const ok = await confirm(`¿Generar planilla para ${periodo}?`);
      if (!ok) return;
      try {
        showLoading('Generando planilla...');
        await empleadosApi.generarPlanilla(periodo);
        hideLoading();
        toast('Planilla generada correctamente', 'ok');
        renderPlanilla(el);
      } catch(err) { hideLoading(); toast('Error: '+err.message,'err'); }
    };
    document.getElementById('btnExportPlanilla').onclick = async () => {
      const { reportesApi } = await import('../api/index.js');
      await reportesApi.descargarPlanilla({ periodo: new Date().toISOString().slice(0,7) });
    };
    window.aprobarPlanilla = async (id) => {
      const ok = await confirm('¿Aprobar y proceder al pago de esta planilla?');
      if (!ok) return;
      try {
        await empleadosApi.aprobarPlanilla(id);
        toast('Planilla aprobada', 'ok');
        renderPlanilla(el);
      } catch(err) { toast('Error: '+err.message,'err'); }
    };
  } catch(err) { hideLoading(); toast('Error: '+err.message,'err'); }
}

async function renderComisionesRRHH(el) {
  try {
    showLoading();
    const data = await import('../api/index.js').then(m => m.comisionesApi.resumenVendedor());
    hideLoading();
    el.innerHTML = `
      <div class="panel" style="margin-top:20px">
        <div class="ph"><div><div class="pt">Comisiones vendedores — Mes actual</div></div></div>
        <div class="tw"><table>
          <thead><tr><th>Vendedor</th><th class="r">Ventas</th><th class="r">Monto vendido</th><th class="r">Comisión bruta</th><th class="r">Comisión neta</th><th>Estado</th></tr></thead>
          <tbody>
            ${data.map(d=>`
              <tr>
                <td><strong>${fmt.nombre(d.vendedor)}</strong></td>
                <td class="r">${d.ventas}</td>
                <td class="r">${fmt.usd(d.montoBruto)}</td>
                <td class="r">${fmt.usd(d.montoBruto * 0.035)}</td>
                <td class="r" style="color:var(--leaf);font-weight:600">${fmt.usd(d.montoNeto)}</td>
                <td>${d.comisiones.every(c=>c.estado==='PAGADA') ? estadoPill('AL_DIA') : estadoPill('PENDIENTE')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table></div>
      </div>
    `;
  } catch(err) { hideLoading(); toast('Error: '+err.message,'err'); }
}
