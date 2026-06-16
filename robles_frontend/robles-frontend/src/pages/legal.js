// src/pages/legal.js — Legal conectado al backend
import { contratosApi, documentosApi } from '../api/index.js';
import { fmt, estadoPill, toast, showLoading, hideLoading, renderTable } from '../utils/ui.js';

export async function initLegal(container) {
  container.innerHTML = `
    <div class="tabs">
      <div class="tab active" data-tab="resumen">Resumen</div>
      <div class="tab" data-tab="contratos">Contratos clientes</div>
      <div class="tab" data-tab="proveedores">Contratos proveedores</div>
      <div class="tab" data-tab="documentos">Documentos</div>
      <div class="tab" data-tab="alertas">Alertas legales</div>
    </div>
    <div id="legal-content" style="padding:0 24px 24px"></div>
  `;
  container.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderLegalTab(container.querySelector('#legal-content'), tab.dataset.tab);
    });
  });
  renderLegalTab(container.querySelector('#legal-content'), 'resumen');
}

async function renderLegalTab(el, tab) {
  switch(tab) {
    case 'resumen':    return renderResumenLegal(el);
    case 'contratos':  return renderContratos(el);
    case 'proveedores':return renderContratosProveedores(el);
    case 'documentos': return renderDocumentos(el);
    case 'alertas':    return renderAlertasLegal(el);
  }
}

async function renderResumenLegal(el) {
  try {
    showLoading();
    const [contratos, alertas, docs] = await Promise.all([
      contratosApi.list({ limit: 6 }),
      contratosApi.alertas(30),
      documentosApi.list({ limit: 5 })
    ]);
    hideLoading();
    const firmados  = contratos.contratos.filter(c => c.estado === 'FIRMADO').length;
    const pendientes = contratos.contratos.filter(c => c.estado === 'PENDIENTE_FIRMA').length;

    el.innerHTML = `
      <div class="kpi-row" style="margin-top:20px">
        <div class="kpi"><div class="kpi-top"><div class="ki g"></div><div class="trend up">${firmados} firmados</div></div><div class="kpi-val">${contratos.total}</div><div class="kpi-lbl">Contratos clientes</div></div>
        <div class="kpi"><div class="kpi-top"><div class="ki gold"></div><div class="trend dn">Urgente</div></div><div class="kpi-val">${alertas.length}</div><div class="kpi-lbl">Vencimientos 30 días</div></div>
        <div class="kpi"><div class="kpi-top"><div class="ki b"></div><div class="trend fl">En nube</div></div><div class="kpi-val">${docs.length}</div><div class="kpi-lbl">Documentos recientes</div></div>
        <div class="kpi"><div class="kpi-top"><div class="ki r"></div><div class="trend dn">Revisar</div></div><div class="kpi-val">${pendientes}</div><div class="kpi-lbl">Pendientes firma</div></div>
      </div>
      <div class="g2">
        <div class="panel">
          <div class="ph"><div><div class="pt">Contratos recientes</div></div><button class="plink" onclick="">Ver todos</button></div>
          <div class="tw"><table>
            <thead><tr><th>#</th><th>Cliente</th><th>Proyecto</th><th class="r">Monto</th><th>Estado</th></tr></thead>
            <tbody>
              ${contratos.contratos.map(c => `
                <tr>
                  <td style="font-size:11px;color:var(--text-muted)">${c.numero}</td>
                  <td><strong>${c.cliente ? fmt.nombre(c.cliente) : '—'}</strong></td>
                  <td>${c.proyecto?.nombre || '—'}</td>
                  <td class="r" style="color:var(--leaf);font-weight:500">${fmt.usd(c.monto)}</td>
                  <td>${estadoPill(c.estado)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table></div>
        </div>
        <div class="panel">
          <div class="ph"><div><div class="pt">Alertas de vencimiento</div><div class="ps">Próximos 30 días</div></div></div>
          <div class="pb">
            ${alertas.length === 0
              ? `<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:12.5px">Sin alertas activas ✓</div>`
              : alertas.slice(0,5).map(a => `
                <div class="alert-box ${a.urgencia==='CRITICO'?'e':'w'}" style="margin-bottom:8px">
                  <div class="ab-ico"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
                  <div>
                    <div class="ab-ttl">${a.descripcion}</div>
                    <div class="ab-desc">Vence ${fmt.fecha(a.vencimiento)} · <strong>${a.diasRestantes} días</strong></div>
                  </div>
                </div>
              `).join('')
            }
          </div>
        </div>
      </div>
    `;
  } catch(err) { hideLoading(); toast('Error: '+err.message,'err'); }
}

async function renderContratos(el) {
  try {
    showLoading();
    const data = await contratosApi.list({ limit: 20 });
    hideLoading();
    el.innerHTML = `
      <div class="search-row" style="margin-top:20px">
        <select class="sel" id="filtroEstCont">
          <option value="">Todos</option>
          <option value="FIRMADO">Firmados</option>
          <option value="PENDIENTE_FIRMA">Pendientes firma</option>
          <option value="EN_REVISION">En revisión</option>
        </select>
        <button class="btn-pri" style="height:36px" id="btnNuevoCont">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Nuevo contrato
        </button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:13px">
        ${data.contratos.map(c => `
          <div style="background:var(--white);border:1px solid ${c.estado==='PENDIENTE_FIRMA'?'rgba(184,135,42,.3)':'var(--border)'};border-radius:14px;overflow:hidden;cursor:pointer;transition:box-shadow .2s" onmouseover="this.style.boxShadow='0 4px 18px rgba(61,31,10,.08)'" onmouseout="this.style.boxShadow=''">
            <div style="height:4px;background:${c.estado==='FIRMADO'?'linear-gradient(90deg,var(--leaf),var(--leaf-light))':c.estado==='PENDIENTE_FIRMA'?'linear-gradient(90deg,var(--gold),#e8c870)':'linear-gradient(90deg,var(--red),#e07060)'}"></div>
            <div style="padding:14px 16px">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
                <div>
                  <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px">${c.numero}</div>
                  <div style="font-family:'Cormorant Garamond',serif;font-size:15px;font-weight:600;color:var(--bark)">${c.cliente ? fmt.nombre(c.cliente) : 'Sin cliente'}</div>
                  <div style="font-size:11px;color:var(--text-muted)">${c.tipo}</div>
                </div>
                ${estadoPill(c.estado)}
              </div>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:8px">
                <div><div style="font-size:9px;color:var(--text-muted)">Proyecto</div><div style="font-size:11.5px;font-weight:500">${c.proyecto?.nombre?.split(' ')[0] || '—'}</div></div>
                <div><div style="font-size:9px;color:var(--text-muted)">Monto</div><div style="font-size:11.5px;font-weight:500;color:var(--leaf)">${fmt.usd(c.monto)}</div></div>
                <div><div style="font-size:9px;color:var(--text-muted)">Docs</div><div style="font-size:11.5px;font-weight:500">${c.documentos?.length || 0}</div></div>
              </div>
              ${c.estado==='PENDIENTE_FIRMA'?`
                <button onclick="firmarContrato('${c.id}')" style="width:100%;margin-top:10px;background:var(--bark);color:white;border:none;border-radius:7px;padding:6px;font-size:11.5px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif">Registrar firma</button>
              `:''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
    window.firmarContrato = async (id) => {
      const notaria = prompt('Notaría donde se firmó el contrato:');
      if (!notaria) return;
      try {
        await contratosApi.firmar(id, { notaria });
        toast('Contrato marcado como firmado', 'ok');
        renderContratos(el);
      } catch(err) { toast('Error: '+err.message,'err'); }
    };
    document.getElementById('btnNuevoCont').onclick = () => mostrarModalContrato(el);
    document.getElementById('filtroEstCont').onchange = async (e) => {
      const d = await contratosApi.list({ estado: e.target.value, limit: 20 });
      // Re-render cards
    };
  } catch(err) { hideLoading(); toast('Error: '+err.message,'err'); }
}

async function renderContratosProveedores(el) {
  try {
    showLoading();
    const contratos = await contratosApi.proveedores();
    hideLoading();
    el.innerHTML = `
      <div class="search-row" style="margin-top:20px">
        <button class="btn-pri" style="height:36px" id="btnNuevoContProv">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Nuevo contrato proveedor
        </button>
      </div>
      <div class="panel">
        <div class="tw"><table>
          <thead><tr><th>#</th><th>Proveedor</th><th>Tipo</th><th>Proyecto</th><th class="r">Monto anual</th><th>Inicio</th><th>Vencimiento</th><th>Días rest.</th><th>Estado</th></tr></thead>
          <tbody>
            ${contratos.map((c,i) => `
              <tr style="background:${c.alertaVencimiento?'rgba(253,240,238,.3)':i%2===1?'var(--off)':'var(--white)'}">
                <td style="font-size:11px;color:var(--text-muted)">${c.numero}</td>
                <td><strong>${c.proveedor?.nombre || '—'}</strong></td>
                <td>${c.tipo}</td>
                <td>${c.proyecto?.nombre || 'Todos'}</td>
                <td class="r" style="font-weight:500">${fmt.usd(c.montoAnual)}</td>
                <td>${fmt.fecha(c.fechaInicio)}</td>
                <td style="color:${c.diasRestantes<=7?'var(--red)':c.diasRestantes<=15?'var(--gold)':'inherit'};font-weight:${c.diasRestantes<=15?500:400}">${fmt.fecha(c.fechaVencimiento)}</td>
                <td style="color:${c.diasRestantes<=7?'var(--red)':c.diasRestantes<=30?'var(--gold)':'var(--leaf)'};font-weight:600">${c.diasRestantes} días</td>
                <td><span style="background:${c.alertaVencimiento?'var(--red-bg)':'var(--leaf-pale)'};color:${c.alertaVencimiento?'var(--red)':'var(--leaf)'};padding:2px 9px;border-radius:20px;font-size:10px;font-weight:500">${c.alertaVencimiento?'⚠ Por vencer':'Vigente'}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table></div>
      </div>
    `;
  } catch(err) { hideLoading(); toast('Error: '+err.message,'err'); }
}

async function renderDocumentos(el) {
  try {
    showLoading();
    const docs = await documentosApi.list({ limit: 30 });
    hideLoading();
    el.innerHTML = `
      <div style="margin-top:20px">
        <div style="border:1.5px dashed var(--border-dark);border-radius:12px;padding:24px;text-align:center;cursor:pointer;background:var(--off);margin-bottom:16px" id="uploadZone">
          <svg style="width:32px;height:32px;fill:none;stroke:var(--border-dark);stroke-width:1.2;stroke-linecap:round;margin-bottom:8px" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <p style="font-size:13px;color:var(--text-muted)">Arrastra archivos o haz clic para subir</p>
          <span style="font-size:11px;color:var(--text-muted)">PDF, Word, Excel, JPG · Máx. 50 MB</span>
          <input type="file" id="fileInput" style="display:none" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png">
        </div>
        <div class="panel">
          <div class="ph"><div><div class="pt">Repositorio de documentos</div><div class="ps">${docs.length} archivos almacenados</div></div></div>
          <div>
            ${docs.map(d => `
              <div style="display:flex;align-items:center;gap:11px;padding:9px 14px;border-bottom:1px solid var(--border);transition:background .12s" onmouseover="this.style.background='var(--off)'" onmouseout="this.style.background=''">
                <div style="width:34px;height:34px;border-radius:8px;background:${docColor(d.categoria)};display:flex;align-items:center;justify-content:center;flex-shrink:0">
                  <svg style="width:16px;height:16px;fill:none;stroke:${docStroke(d.categoria)};stroke-width:1.6;stroke-linecap:round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div style="flex:1">
                  <div style="font-size:12.5px;font-weight:500;color:var(--bark)">${d.nombre}</div>
                  <div style="font-size:11px;color:var(--text-muted)">${d.categoria} · ${fmt.fecha(d.createdAt)}${d.fechaVencimiento?' · Vence: '+fmt.fecha(d.fechaVencimiento):''}</div>
                </div>
                <span style="font-size:11px;color:var(--text-muted)">${d.tamanoKb?d.tamanoKb+' KB':'—'}</span>
                <span style="background:${d.estado==='VIGENTE'?'var(--leaf-pale)':'var(--warn-bg)'};color:${d.estado==='VIGENTE'?'var(--leaf)':'var(--gold)'};padding:2px 9px;border-radius:20px;font-size:10px;font-weight:500;margin-left:8px">${d.estado}</span>
                <a href="${d.urlArchivo}" target="_blank" class="plink" style="margin-left:6px;text-decoration:none">↓</a>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    const zone  = document.getElementById('uploadZone');
    const input = document.getElementById('fileInput');
    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.background = 'var(--leaf-pale)'; });
    zone.addEventListener('dragleave', () => zone.style.background = 'var(--off)');
    zone.addEventListener('drop', e => { e.preventDefault(); zone.style.background = 'var(--off)'; if(e.dataTransfer.files.length) subirArchivos(e.dataTransfer.files, el); });
    input.addEventListener('change', () => { if(input.files.length) subirArchivos(input.files, el); });
  } catch(err) { hideLoading(); toast('Error: '+err.message,'err'); }
}

async function subirArchivos(files, el) {
  for (const file of files) {
    const fd = new FormData();
    fd.append('archivo', file);
    fd.append('nombre', file.name);
    fd.append('categoria', 'Documento general');
    try {
      await documentosApi.subir(fd);
      toast(`${file.name} subido correctamente`, 'ok');
    } catch(err) { toast(`Error al subir ${file.name}: ${err.message}`, 'err'); }
  }
  renderDocumentos(el);
}

async function renderAlertasLegal(el) {
  try {
    showLoading();
    const alertas = await contratosApi.alertas(60);
    hideLoading();
    el.innerHTML = `
      <div class="kpi-row" style="margin-top:20px">
        <div class="kpi"><div class="kpi-top"><div class="ki r"></div><div class="trend dn">Esta semana</div></div><div class="kpi-val">${alertas.filter(a=>a.diasRestantes<=7).length}</div><div class="kpi-lbl">Críticos (≤7 días)</div></div>
        <div class="kpi"><div class="kpi-top"><div class="ki gold"></div><div class="trend fl">Este mes</div></div><div class="kpi-val">${alertas.filter(a=>a.diasRestantes>7&&a.diasRestantes<=30).length}</div><div class="kpi-lbl">Próximos (8-30 días)</div></div>
        <div class="kpi"><div class="kpi-top"><div class="ki bl"></div><div class="trend fl">60 días</div></div><div class="kpi-val">${alertas.length}</div><div class="kpi-lbl">Total vencimientos</div></div>
      </div>
      <div class="panel">
        <div class="ph"><div><div class="pt">Panel de alertas activas</div><div class="ps">Ordenadas por urgencia</div></div></div>
        <div class="tw"><table>
          <thead><tr><th>Urgencia</th><th>Descripción</th><th>Tipo</th><th>Vencimiento</th><th class="r">Días restantes</th></tr></thead>
          <tbody>
            ${alertas.map((a,i) => `
              <tr style="background:${a.urgencia==='CRITICO'?'rgba(253,240,238,.3)':i%2===1?'var(--off)':'var(--white)'}">
                <td><span style="background:${a.urgencia==='CRITICO'?'var(--red-bg)':a.urgencia==='ALTO'?'var(--warn-bg)':'var(--blue-bg)'};color:${a.urgencia==='CRITICO'?'var(--red)':a.urgencia==='ALTO'?'var(--gold)':'var(--blue)'};padding:2px 9px;border-radius:20px;font-size:10px;font-weight:500">${a.urgencia}</span></td>
                <td><strong>${a.descripcion}</strong></td>
                <td>${a.tipo}</td>
                <td>${fmt.fecha(a.vencimiento)}</td>
                <td class="r" style="color:${a.diasRestantes<=7?'var(--red)':a.diasRestantes<=15?'var(--gold)':'var(--leaf)'};font-weight:600">${a.diasRestantes} días</td>
              </tr>
            `).join('')}
          </tbody>
        </table></div>
      </div>
    `;
  } catch(err) { hideLoading(); toast('Error: '+err.message,'err'); }
}

function docColor(cat) {
  const m = { 'Contrato cliente':'var(--leaf-pale)', 'Contrato proveedor':'#f0ebe4', 'Plano / Permiso':'var(--blue-bg)', 'Póliza de seguro':'var(--gold-bg)', 'Escritura / Derechos Reales':'#f0ebe4' };
  return m[cat] || 'var(--off)';
}
function docStroke(cat) {
  const m = { 'Contrato cliente':'var(--leaf)', 'Contrato proveedor':'var(--bark-mid)', 'Plano / Permiso':'var(--blue)', 'Póliza de seguro':'var(--gold)' };
  return m[cat] || 'var(--text-muted)';
}

function mostrarModalContrato(el) {
  const modal = document.createElement('div');
  modal.className = 'modal-bg open';
  modal.innerHTML = `
    <div class="modal">
      <div class="mhd"><div class="mtitle">Nuevo contrato cliente</div>
        <button class="mclose" onclick="this.closest('.modal-bg').remove()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
      <div class="mbody"><div class="fgrid">
        <div class="fg"><label>Tipo</label><select id="ct-tipo"><option>Compraventa de departamento</option><option>Promesa de compraventa</option></select></div>
        <div class="fg"><label>Fecha de emisión</label><input type="date" id="ct-fecha" value="${new Date().toISOString().slice(0,10)}"></div>
        <div class="fg"><label>Monto (USD)</label><input type="number" id="ct-monto" placeholder="0.00"></div>
        <div class="fg"><label>Notaría</label><input type="text" id="ct-not" placeholder="Notaría N°14 Cbba"></div>
        <div class="fg full"><label>Observaciones</label><textarea id="ct-obs" rows="2"></textarea></div>
      </div></div>
      <div class="mfoot">
        <button class="btn-sec" onclick="this.closest('.modal-bg').remove()">Cancelar</button>
        <button class="btn-pri" id="btnGuardarCont"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>Guardar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#btnGuardarCont').onclick = async () => {
    try {
      await contratosApi.create({
        tipo: document.getElementById('ct-tipo').value,
        fechaEmision: document.getElementById('ct-fecha').value,
        monto: parseFloat(document.getElementById('ct-monto').value),
        notaria: document.getElementById('ct-not').value,
        observacion: document.getElementById('ct-obs').value,
      });
      toast('Contrato registrado', 'ok');
      modal.remove();
      renderContratos(el);
    } catch(err) { toast('Error: '+err.message,'err'); }
  };
  modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
}
