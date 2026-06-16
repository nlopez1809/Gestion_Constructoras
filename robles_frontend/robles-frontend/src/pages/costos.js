// src/pages/costos.js — Control de costos conectado al backend
import { gastosApi, proyectosApi } from '../api/index.js';
import { fmt, estadoPill, toast, showLoading, hideLoading, renderTable } from '../utils/ui.js';

export async function initCostos(container) {
  container.innerHTML = `
    <div class="tabs">
      <div class="tab active" data-tab="resumen">Resumen</div>
      <div class="tab" data-tab="desviaciones">Desviaciones</div>
      <div class="tab" data-tab="rentabilidad">Rentabilidad</div>
      <div class="tab" data-tab="gastos">Registro de gastos</div>
    </div>
    <div id="costos-content" style="padding:0 24px 24px"></div>
  `;
  container.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderCostosTab(container.querySelector('#costos-content'), tab.dataset.tab);
    });
  });
  renderCostosTab(container.querySelector('#costos-content'), 'resumen');
}

async function renderCostosTab(el, tab) {
  switch(tab) {
    case 'resumen':       return renderResumenCostos(el);
    case 'desviaciones':  return renderDesviaciones(el);
    case 'rentabilidad':  return renderRentabilidad(el);
    case 'gastos':        return renderGastos(el);
  }
}

async function renderResumenCostos(el) {
  try {
    showLoading();
    const resumen = await gastosApi.resumen();
    hideLoading();
    const totalPres = resumen.reduce((s, p) => s + p.presupuesto, 0);
    const totalEjec = resumen.reduce((s, p) => s + p.ejecutado, 0);

    el.innerHTML = `
      <div class="kpi-row" style="margin-top:20px">
        <div class="kpi"><div class="kpi-top"><div class="ki b"></div><div class="trend fl">Total</div></div><div class="kpi-val">${fmt.usd(totalPres)}</div><div class="kpi-lbl">Presupuesto total</div></div>
        <div class="kpi"><div class="kpi-top"><div class="ki gold"></div><div class="trend fl">${fmt.pct(totalEjec/totalPres*100)}</div></div><div class="kpi-val">${fmt.usd(totalEjec)}</div><div class="kpi-lbl">Total ejecutado</div></div>
        <div class="kpi"><div class="kpi-top"><div class="ki g"></div><div class="trend up">Superávit</div></div><div class="kpi-val">${fmt.usd(totalPres-totalEjec)}</div><div class="kpi-lbl">Saldo disponible</div></div>
        <div class="kpi"><div class="kpi-top"><div class="ki r"></div><div class="trend dn">${resumen.filter(p=>p.sobrecosto).length} proyecto(s)</div></div><div class="kpi-val">${resumen.filter(p=>p.sobrecosto).length}</div><div class="kpi-lbl">Proyectos con sobrecosto</div></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(${Math.min(resumen.length,4)},1fr);gap:13px;margin-bottom:18px">
        ${resumen.map(p => `
          <div style="background:var(--white);border:1px solid ${p.sobrecosto?'rgba(192,64,48,.3)':'var(--border)'};border-radius:14px;padding:18px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
              <div>
                <div style="font-family:'Cormorant Garamond',serif;font-size:15px;font-weight:600;color:var(--bark)">${p.proyecto.nombre}</div>
                <div style="font-size:11px;color:var(--text-muted)">${estadoPill(p.proyecto.estado)}</div>
              </div>
              <div style="text-align:right">
                <div style="font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:600;color:${p.sobrecosto?'var(--red)':p.pctEjecutado>80?'var(--gold)':'var(--leaf)'}">${fmt.pct(p.pctEjecutado)}</div>
                <div style="font-size:9px;color:var(--text-muted);text-transform:uppercase">ejecutado</div>
              </div>
            </div>
            <div style="margin-bottom:4px;font-size:11px;color:var(--text-muted)">Presupuesto: ${fmt.usd(p.presupuesto)}</div>
            <div class="prog-bar"><div class="prog-fill" style="width:${Math.min(p.pctEjecutado,100)}%;background:${p.sobrecosto?'var(--red)':p.pctEjecutado>80?'var(--gold)':'var(--leaf)'}"></div></div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px">
              <div><div style="font-size:9px;color:var(--text-muted)">Ejecutado</div><div style="font-size:12px;font-weight:500;color:var(--gold)">${fmt.usd(p.ejecutado)}</div></div>
              <div><div style="font-size:9px;color:var(--text-muted)">Saldo</div><div style="font-size:12px;font-weight:500;color:${p.sobrecosto?'var(--red)':'var(--leaf)'}">${fmt.usd(p.saldo)}</div></div>
              <div><div style="font-size:9px;color:var(--text-muted)">Margen</div><div style="font-size:12px;font-weight:500">—</div></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch(err) { hideLoading(); toast('Error: '+err.message,'err'); }
}

async function renderDesviaciones(el) {
  try {
    showLoading();
    const desv = await gastosApi.desviaciones();
    hideLoading();
    el.innerHTML = `
      <div class="panel" style="margin-top:20px">
        <div class="ph"><div><div class="pt">Control de desviaciones por proyecto y categoría</div></div><button class="plink">Exportar PDF</button></div>
        <div class="tw"><table>
          <thead><tr><th>Proyecto</th><th>Categoría</th><th class="r">Presupuesto</th><th class="r">Ejecutado</th><th class="r">Desviación $</th><th class="r">Uso %</th><th>Estado</th></tr></thead>
          <tbody>
            ${desv.map((d,i) => `
              <tr style="background:${i%2===1?'var(--off)':'var(--white)'}">
                <td><strong>${d.proyecto}</strong></td>
                <td>${d.categoria}</td>
                <td class="r">${fmt.usd(d.presupuesto)}</td>
                <td class="r" style="color:${d.ejecutado>d.presupuesto?'var(--red)':'var(--text-mid)'};font-weight:500">${fmt.usd(d.ejecutado)}</td>
                <td class="r" style="color:${d.desviacion<0?'var(--red)':'var(--leaf)'};font-weight:500">${d.desviacion>=0?'+':''}${fmt.usd(d.desviacion)}</td>
                <td class="r">
                  <div style="display:flex;align-items:center;gap:8px;justify-content:flex-end">
                    <div style="width:60px;height:5px;background:var(--border);border-radius:20px;overflow:hidden">
                      <div style="width:${Math.min(d.pctUso,100)}%;height:100%;background:${d.estado==='SOBRECOSTO'?'var(--red)':d.estado==='ATENCION'?'var(--gold)':'var(--leaf)'};border-radius:20px"></div>
                    </div>
                    ${fmt.pct(d.pctUso)}
                  </div>
                </td>
                <td>${d.estado==='SOBRECOSTO'?'<span style="background:var(--red-bg);color:var(--red);padding:2px 9px;border-radius:20px;font-size:10px;font-weight:500">Sobrecosto</span>':d.estado==='ATENCION'?'<span style="background:var(--warn-bg);color:var(--gold);padding:2px 9px;border-radius:20px;font-size:10px;font-weight:500">Atención</span>':'<span style="background:var(--leaf-pale);color:var(--leaf);padding:2px 9px;border-radius:20px;font-size:10px;font-weight:500">OK</span>'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table></div>
      </div>
    `;
  } catch(err) { hideLoading(); toast('Error: '+err.message,'err'); }
}

async function renderRentabilidad(el) {
  try {
    showLoading();
    const rent = await gastosApi.rentabilidad();
    hideLoading();
    el.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:20px">
        ${rent.map(r => `
          <div style="background:var(--white);border:1px solid var(--border);border-radius:14px;padding:18px">
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px">
              <span style="font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:600;color:var(--bark)">${r.proyecto.nombre}</span>
              <span style="background:${r.pctMargenBruto>=25?'var(--leaf-pale)':r.pctMargenBruto>=15?'var(--warn-bg)':'var(--red-bg)'};color:${r.pctMargenBruto>=25?'var(--leaf)':r.pctMargenBruto>=15?'var(--gold)':'var(--red)'};padding:2px 10px;border-radius:20px;font-size:10px;font-weight:600">${fmt.pct(r.pctMargenBruto)} margen</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
              ${[
                ['Ingresos proyectados', fmt.usd(r.ingresoProyectado), 'var(--leaf)'],
                ['Costo total', fmt.usd(r.costoTotal), 'var(--gold)'],
                ['Margen bruto', fmt.usd(r.margenBruto), 'var(--leaf)'],
                ['Costo/m²', fmt.usd(r.costoPorM2), 'var(--text-mid)'],
              ].map(([l,v,c]) => `
                <div style="background:var(--off);border-radius:9px;padding:10px 12px">
                  <div style="font-size:9.5px;color:var(--text-muted);text-transform:uppercase;margin-bottom:3px">${l}</div>
                  <div style="font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:${c}">${v}</div>
                </div>
              `).join('')}
            </div>
            <div style="font-size:10.5px;color:var(--text-muted);margin-bottom:4px;display:flex;justify-content:space-between">
              <span>Margen bruto</span><span style="font-weight:500;color:var(--leaf)">${fmt.pct(r.pctMargenBruto)}</span>
            </div>
            <div class="prog-bar" style="height:8px"><div class="prog-fill" style="width:${Math.min(r.pctMargenBruto,100)}%;background:${r.pctMargenBruto>=25?'var(--leaf)':r.pctMargenBruto>=15?'var(--gold)':'var(--red)'}"></div></div>
          </div>
        `).join('')}
      </div>
    `;
  } catch(err) { hideLoading(); toast('Error: '+err.message,'err'); }
}

async function renderGastos(el) {
  try {
    showLoading();
    const [gastos, proyectos] = await Promise.all([gastosApi.list({ limit: 20 }), proyectosApi.list()]);
    hideLoading();
    el.innerHTML = `
      <div class="search-row" style="margin-top:20px">
        <select class="sel" id="filtroProyGasto">
          <option value="">Todos los proyectos</option>
          ${proyectos.map(p=>`<option value="${p.id}">${p.nombre}</option>`).join('')}
        </select>
        <select class="sel" id="filtroCatGasto">
          <option value="">Todas las categorías</option>
          ${['Materiales','Mano de obra','Equipamiento','Gastos adm.','Marketing'].map(c=>`<option value="${c}">${c}</option>`).join('')}
        </select>
        <button class="btn-pri" style="height:36px" id="btnNuevoGasto">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Registrar gasto
        </button>
      </div>
      <div class="panel"><div id="tablaGastos"></div></div>
    `;
    const renderGastosTabla = (items) => {
      renderTable(document.getElementById('tablaGastos'), [
        { header: '#', render: g=>`<span style="font-size:11px;color:var(--text-muted)">${g.numero}</span>` },
        { header: 'Fecha', render: g => fmt.fecha(g.fecha) },
        { header: 'Descripción', render: g => `<strong>${g.descripcion}</strong>` },
        { header: 'Proyecto', render: g => g.proyecto?.nombre || '—' },
        { header: 'Categoría', key: 'categoria' },
        { header: 'Tipo', key: 'tipo' },
        { header: 'USD', align:'right', render: g => `<span style="color:var(--red);font-weight:500">${fmt.usd(g.montoUSD)}</span>` },
        { header: 'Bs', align:'right', render: g => `<span style="color:var(--text-muted)">${fmt.bs(g.montoBs)}</span>` },
        { header: 'Registrado por', render: g => g.registradoPor?.nombre || '—' },
      ], items.gastos || items, 'Sin gastos');
    };
    renderGastosTabla(gastos);
    const cargar = async () => {
      const params = { limit: 20 };
      const filtProy = document.getElementById('filtroProyGasto').value;
      const filtCat  = document.getElementById('filtroCatGasto').value;
      if (filtProy) params.proyectoId = filtProy;
      if (filtCat)  params.categoria  = filtCat;
      const d = await gastosApi.list(params);
      renderGastosTabla(d);
    };
    document.getElementById('filtroProyGasto').addEventListener('change', cargar);
    document.getElementById('filtroCatGasto').addEventListener('change', cargar);
    document.getElementById('btnNuevoGasto').addEventListener('click', () => mostrarModalGasto(proyectos, el));
  } catch(err) { hideLoading(); toast('Error: '+err.message,'err'); }
}

function mostrarModalGasto(proyectos, el) {
  const modal = document.createElement('div');
  modal.className = 'modal-bg open';
  modal.innerHTML = `
    <div class="modal">
      <div class="mhd"><div class="mtitle">Registrar gasto de proyecto</div>
        <button class="mclose" onclick="this.closest('.modal-bg').remove()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
      <div class="mbody"><div class="fgrid">
        <div class="fg full"><label>Descripción</label><input type="text" id="g-desc" placeholder="Descripción del gasto..."></div>
        <div class="fg"><label>Proyecto</label><select id="g-proy">${proyectos.map(p=>`<option value="${p.id}">${p.nombre}</option>`).join('')}</select></div>
        <div class="fg"><label>Fecha</label><input type="date" id="g-fecha" value="${new Date().toISOString().slice(0,10)}"></div>
        <div class="fg"><label>Categoría</label><select id="g-cat">${['Materiales','Mano de obra','Equipamiento','Gastos adm.','Marketing'].map(c=>`<option>${c}</option>`).join('')}</select></div>
        <div class="fg"><label>Tipo</label><select id="g-tipo"><option value="Directo">Directo</option><option value="Indirecto">Indirecto</option></select></div>
        <div class="fg"><label>Monto USD</label><input type="number" id="g-monto" step="0.01" placeholder="0.00"></div>
        <div class="fg"><label>N° Factura</label><input type="text" id="g-fac" placeholder="Opcional"></div>
        <div class="fg full"><label>Observaciones</label><textarea id="g-obs" rows="2" placeholder="Notas adicionales..."></textarea></div>
      </div></div>
      <div class="mfoot">
        <button class="btn-sec" onclick="this.closest('.modal-bg').remove()">Cancelar</button>
        <button class="btn-pri" id="btnGuardarGasto"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>Registrar gasto</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#btnGuardarGasto').onclick = async () => {
    const monto = parseFloat(document.getElementById('g-monto').value);
    if (!monto || monto <= 0) { toast('Monto inválido', 'warn'); return; }
    try {
      await gastosApi.create({
        proyectoId: document.getElementById('g-proy').value,
        descripcion: document.getElementById('g-desc').value,
        categoria: document.getElementById('g-cat').value,
        tipo: document.getElementById('g-tipo').value,
        montoUSD: monto,
        fecha: document.getElementById('g-fecha').value,
        factura: document.getElementById('g-fac').value || null,
        observacion: document.getElementById('g-obs').value || null,
      });
      toast('Gasto registrado', 'ok');
      modal.remove();
      renderGastos(el);
    } catch(err) { toast('Error: '+err.message,'err'); }
  };
  modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
}
