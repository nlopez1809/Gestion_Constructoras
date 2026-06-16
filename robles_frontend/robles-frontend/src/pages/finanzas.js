// src/pages/finanzas.js — Finanzas conectado al backend
import { finanzasApi } from '../api/index.js';
import { fmt, estadoPill, toast, showLoading, hideLoading, renderTable } from '../utils/ui.js';

export async function initFinanzas(container) {
  container.innerHTML = `
    <div class="tabs">
      <div class="tab active" data-tab="resumen">Resumen</div>
      <div class="tab" data-tab="movimientos">Movimientos</div>
      <div class="tab" data-tab="flujo">Flujo de caja</div>
      <div class="tab" data-tab="tc">Tipo de cambio</div>
      <div class="tab" data-tab="estados">Estados financieros</div>
    </div>
    <div id="fin-content" style="padding:0 24px 24px"></div>
  `;
  container.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderFinTab(container.querySelector('#fin-content'), tab.dataset.tab);
    });
  });
  renderFinTab(container.querySelector('#fin-content'), 'resumen');
}

async function renderFinTab(el, tab) {
  switch(tab) {
    case 'resumen':     return renderResumenFin(el);
    case 'movimientos': return renderMovimientos(el);
    case 'flujo':       return renderFlujo(el);
    case 'tc':          return renderTC(el);
    case 'estados':     return renderEstados(el);
  }
}

async function renderResumenFin(el) {
  try {
    showLoading();
    const [saldo, flujo, tc] = await Promise.all([
      finanzasApi.saldoCaja(),
      finanzasApi.flujo({ meses: 6 }),
      finanzasApi.tcVigente()
    ]);
    hideLoading();
    const mesActual = flujo[flujo.length - 1] || {};
    el.innerHTML = `
      <div class="kpi-row" style="margin-top:20px">
        <div class="kpi"><div class="kpi-top"><div class="ki g"><svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg></div><div class="trend up">↑ Este mes</div></div><div class="kpi-val">${fmt.usd(mesActual.ingresos||0)}</div><div class="kpi-lbl">Ingresos del mes</div></div>
        <div class="kpi"><div class="kpi-top"><div class="ki r"><svg viewBox="0 0 24 24"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/></svg></div><div class="trend fl">Este mes</div></div><div class="kpi-val">${fmt.usd(mesActual.egresos||0)}</div><div class="kpi-lbl">Egresos del mes</div></div>
        <div class="kpi"><div class="kpi-top"><div class="ki gold"><svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div><div class="trend up">↑ Neto</div></div><div class="kpi-val">${fmt.usd(mesActual.neto||0)}</div><div class="kpi-lbl">Flujo neto del mes</div></div>
        <div class="kpi"><div class="kpi-top"><div class="ki b"><svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg></div><div class="trend fl">TC: ${tc.tcOficial}</div></div><div class="kpi-val">${fmt.usd(saldo.saldoUSD)}</div><div class="kpi-lbl">Saldo total en caja</div></div>
      </div>
      <div class="g21">
        <div class="panel">
          <div class="ph"><div><div class="pt">Flujo mensual</div><div class="ps">Ingresos vs Egresos — USD</div></div></div>
          <div class="pb">
            <table style="width:100%;border-collapse:collapse">
              <thead><tr>
                <th style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);padding:8px 14px;background:var(--off);border-bottom:1px solid var(--border);text-align:left">Mes</th>
                <th style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);padding:8px 14px;background:var(--off);border-bottom:1px solid var(--border);text-align:right">Ingresos</th>
                <th style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);padding:8px 14px;background:var(--off);border-bottom:1px solid var(--border);text-align:right">Egresos</th>
                <th style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);padding:8px 14px;background:var(--off);border-bottom:1px solid var(--border);text-align:right">Neto</th>
                <th style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);padding:8px 14px;background:var(--off);border-bottom:1px solid var(--border);text-align:right">Saldo final</th>
              </tr></thead>
              <tbody>
                ${flujo.map((m,i)=>`
                  <tr style="background:${i%2===1?'var(--off)':'var(--white)'}">
                    <td style="padding:8px 14px;font-size:12.5px;font-weight:${i===flujo.length-1?'600':'400'};color:var(--bark)">${m.mesLabel}</td>
                    <td style="padding:8px 14px;font-size:12.5px;text-align:right;color:var(--leaf);font-weight:500">${fmt.usd(m.ingresos)}</td>
                    <td style="padding:8px 14px;font-size:12.5px;text-align:right;color:var(--red);font-weight:500">${fmt.usd(m.egresos)}</td>
                    <td style="padding:8px 14px;font-size:12.5px;text-align:right;color:${m.neto>=0?'var(--leaf)':'var(--red)'};font-weight:600">${m.neto>=0?'+':''}${fmt.usd(m.neto)}</td>
                    <td style="padding:8px 14px;font-size:12.5px;text-align:right;font-weight:500">${fmt.usd(m.saldoFinal)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:14px">
          <div style="background:var(--white);border:1px solid var(--border);border-radius:14px;padding:16px">
            <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px">Tipo de cambio vigente</div>
            <div class="tc-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div style="background:var(--off);border-radius:9px;padding:10px 12px;border:1px solid var(--border)">
                <div style="font-size:10px;color:var(--text-muted);margin-bottom:3px">USD → Bs</div>
                <div style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:600;color:var(--bark)">${tc.tcOficial}</div>
              </div>
              <div style="background:var(--off);border-radius:9px;padding:10px 12px;border:1px solid var(--border)">
                <div style="font-size:10px;color:var(--text-muted);margin-bottom:3px">Bs → USD</div>
                <div style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:600;color:var(--bark)">${(1/tc.tcOficial).toFixed(3)}</div>
              </div>
            </div>
            <div style="margin-top:12px">
              <label style="font-size:11px;font-weight:500;color:var(--text-mid);text-transform:uppercase;letter-spacing:.03em;display:block;margin-bottom:5px">Convertidor USD → Bs</label>
              <input type="number" id="conv-usd-r" placeholder="Monto USD" oninput="document.getElementById('conv-bs-r').value=(parseFloat(this.value||0)*${tc.tcOficial}).toFixed(2)+' Bs'" style="width:100%;background:var(--off);border:1px solid var(--border);border-radius:8px;padding:9px 12px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;margin-bottom:6px">
              <input type="text" id="conv-bs-r" readonly placeholder="Equivalente Bs" style="width:100%;background:var(--off);border:1px solid var(--border);border-radius:8px;padding:9px 12px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;color:var(--leaf)">
            </div>
          </div>
          <div style="background:var(--leaf-pale);border-radius:14px;padding:16px;text-align:center">
            <div style="font-size:10px;color:var(--leaf);text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px">Saldo total en caja</div>
            <div style="font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:600;color:var(--bark)">${fmt.usd(saldo.saldoUSD)}</div>
            <div style="font-size:11px;color:var(--leaf-mid);margin-top:3px">${fmt.bs(saldo.saldoBs)}</div>
          </div>
        </div>
      </div>
    `;
  } catch(err) { hideLoading(); toast('Error: '+err.message,'err'); }
}

async function renderMovimientos(el) {
  try {
    showLoading();
    const data = await finanzasApi.movimientos({ limit: 30 });
    hideLoading();
    el.innerHTML = `
      <div class="search-row" style="margin-top:20px">
        <select class="sel" id="filtroTipoMov">
          <option value="">Todos</option><option value="INGRESO">Ingresos</option><option value="EGRESO">Egresos</option>
        </select>
        <button class="btn-pri" style="height:36px" id="btnNuevoMov">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Registrar movimiento
        </button>
      </div>
      <div class="panel">
        <div id="tablaMovs"></div>
      </div>
    `;
    const renderMovs = (movs) => {
      renderTable(document.getElementById('tablaMovs'), [
        { header: '#',        render: m => `<span style="font-size:11px;color:var(--text-muted)">${m.numero}</span>` },
        { header: 'Fecha',    render: m => fmt.fecha(m.fecha) },
        { header: 'Concepto', render: m => `<strong>${m.concepto}</strong>` },
        { header: 'Tipo',     render: m => m.tipo==='INGRESO' ? `<span style="color:var(--leaf);background:var(--leaf-pale);padding:2px 9px;border-radius:20px;font-size:10px;font-weight:500">Ingreso</span>` : `<span style="color:var(--red);background:var(--red-bg);padding:2px 9px;border-radius:20px;font-size:10px;font-weight:500">Egreso</span>` },
        { header: 'Categoría', key: 'categoria' },
        { header: 'Monto USD', align:'right', render: m => `<span style="color:${m.tipo==='INGRESO'?'var(--leaf)':'var(--red)'};font-weight:500">${m.tipo==='INGRESO'?'+':'−'}${fmt.usd(m.montoUSD)}</span>` },
        { header: 'Monto Bs',  align:'right', render: m => `<span style="color:var(--text-muted)">${fmt.bs(m.montoBs)}</span>` },
        { header: 'Método',    key: 'metodo' },
      ], movs, 'Sin movimientos');
    };
    renderMovs(data.movimientos);
    document.getElementById('filtroTipoMov').addEventListener('change', async (e) => {
      const params = {};
      if (e.target.value) params.tipo = e.target.value;
      const d = await finanzasApi.movimientos(params);
      renderMovs(d.movimientos);
    });
    document.getElementById('btnNuevoMov').addEventListener('click', () => mostrarModalMovimiento(el));
  } catch(err) { hideLoading(); toast('Error: '+err.message,'err'); }
}

async function renderFlujo(el) {
  try {
    showLoading();
    const flujo = await finanzasApi.flujo({ meses: 12 });
    hideLoading();
    el.innerHTML = `
      <div class="panel" style="margin-top:20px">
        <div class="ph"><div><div class="pt">Flujo de caja mensual — 12 meses</div></div><button class="plink" id="btnExpFlujo">Exportar Excel</button></div>
        <div class="tw"><table>
          <thead><tr><th>Período</th><th class="r">Saldo inicial</th><th class="r">Ingresos</th><th class="r">Egresos</th><th class="r">Flujo neto</th><th class="r">Saldo final</th></tr></thead>
          <tbody>
            ${flujo.map((m,i)=>`
              <tr style="background:${i===flujo.length-1?'rgba(221,240,204,.15)':i%2===1?'var(--off)':'var(--white)'}">
                <td style="font-weight:${i===flujo.length-1?600:400}">${m.mesLabel}</td>
                <td class="r">${fmt.usd(m.saldoFinal - m.neto)}</td>
                <td class="r" style="color:var(--leaf);font-weight:500">${fmt.usd(m.ingresos)}</td>
                <td class="r" style="color:var(--red);font-weight:500">${fmt.usd(m.egresos)}</td>
                <td class="r" style="color:${m.neto>=0?'var(--leaf)':'var(--red)'};font-weight:600">${m.neto>=0?'+':''}${fmt.usd(m.neto)}</td>
                <td class="r" style="font-weight:600;color:${i===flujo.length-1?'var(--leaf)':'inherit'}">${fmt.usd(m.saldoFinal)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table></div>
      </div>
    `;
  } catch(err) { hideLoading(); toast('Error: '+err.message,'err'); }
}

async function renderTC(el) {
  try {
    showLoading();
    const historial = await finanzasApi.tcHistorial();
    hideLoading();
    el.innerHTML = `
      <div class="panel" style="margin-top:20px">
        <div class="ph"><div><div class="pt">Historial tipo de cambio</div><div class="ps">USD/BOB — BCB oficial</div></div>
          <button class="btn-pri" id="btnNuevoTC" style="height:34px;font-size:11.5px">Actualizar TC</button>
        </div>
        <div class="tw"><table>
          <thead><tr><th>Período</th><th class="r">TC Oficial (USD→Bs)</th><th class="r">TC Paralelo</th><th>Fuente</th></tr></thead>
          <tbody>
            ${historial.map((t,i)=>`
              <tr style="background:${i===0?'rgba(221,240,204,.15)':i%2===1?'var(--off)':'var(--white)'}">
                <td style="font-weight:${i===0?600:400}">${t.periodo}${i===0?' (vigente)':''}</td>
                <td class="r" style="font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:var(--bark)">${t.tcOficial}</td>
                <td class="r" style="color:var(--text-muted)">${t.tcParalelo || '—'}</td>
                <td>${t.fuente}</td>
              </tr>
            `).join('')}
          </tbody>
        </table></div>
      </div>
    `;
    document.getElementById('btnNuevoTC').onclick = () => mostrarModalTC(el);
  } catch(err) { hideLoading(); toast('Error: '+err.message,'err'); }
}

async function renderEstados(el) {
  try {
    showLoading();
    const er = await finanzasApi.estadoResultados();
    hideLoading();
    el.innerHTML = `
      <div class="g2" style="margin-top:20px">
        <div class="panel">
          <div class="ph"><div><div class="pt">Estado de Resultados</div><div class="ps">${er.periodo}</div></div></div>
          <div class="pb">
            ${renderSeccionER('Ingresos operacionales', er.ingresos?.items || [], er.ingresos?.total || 0, 'var(--leaf)')}
            ${renderSeccionER('Costo de ventas', er.costoVentas?.items || [], er.costoVentas?.total || 0, 'var(--red)', true)}
            <div style="display:flex;justify-content:space-between;padding:10px 0;margin:4px 0;border-top:1.5px solid var(--border-dark)">
              <span style="font-size:13px;font-weight:600;color:var(--bark)">Utilidad bruta</span>
              <span style="font-size:13px;font-weight:600;color:var(--leaf)">${fmt.usd(er.utilidadBruta)} <span style="font-size:11px;color:var(--text-muted)">(${fmt.pct(er.margenBruto)})</span></span>
            </div>
            ${renderSeccionER('Gastos operativos', er.gastosOperativos?.items || [], er.gastosOperativos?.total || 0, 'var(--red)', true)}
            <div style="background:var(--leaf-pale);border-radius:10px;padding:14px;margin-top:10px;display:flex;justify-content:space-between;align-items:baseline">
              <span style="font-size:13px;font-weight:600;color:var(--bark)">Utilidad neta del período</span>
              <span style="font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:600;color:var(--leaf)">${fmt.usd(er.utilidadNeta)}</span>
            </div>
          </div>
        </div>
        <div class="panel" style="align-self:start">
          <div class="ph"><div><div class="pt">Margen de utilidad</div></div></div>
          <div class="pb" style="display:flex;flex-direction:column;gap:14px">
            ${[
              ['Margen bruto', er.margenBruto, 'var(--leaf)'],
              ['Margen neto', er.margenNeto, 'var(--leaf-mid)'],
            ].map(([l,v,c]) => `
              <div>
                <div style="display:flex;justify-content:space-between;margin-bottom:5px">
                  <span style="font-size:12.5px;color:var(--text-mid)">${l}</span>
                  <span style="font-size:13px;font-weight:600;color:${c}">${fmt.pct(v)}</span>
                </div>
                <div class="prog-bar" style="height:10px"><div class="prog-fill" style="width:${Math.min(v,100)}%;background:${c}"></div></div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  } catch(err) { hideLoading(); toast('Error: '+err.message,'err'); }
}

function renderSeccionER(titulo, items, total, color, negativo = false) {
  return `
    <div style="margin-bottom:14px">
      <div style="font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.12em;color:var(--text-muted);border-bottom:1px solid var(--border);padding-bottom:6px;margin-bottom:8px">${titulo}</div>
      ${items.map(item => `
        <div style="display:flex;justify-content:space-between;padding:5px 0 5px 14px;font-size:12.5px;color:var(--text-muted)">
          <span>${item.categoria || item._groupBy || 'Varios'}</span>
          <span style="color:${color}">${negativo?'−':''}${fmt.usd(item._sum?.montoUSD || 0)}</span>
        </div>
      `).join('')}
      <div style="display:flex;justify-content:space-between;padding:7px 0;border-top:1px solid var(--border);font-weight:600;color:var(--bark)">
        <span>Total</span><span style="color:${color}">${negativo?'−':''}${fmt.usd(total)}</span>
      </div>
    </div>
  `;
}

function mostrarModalMovimiento(el) {
  const modal = document.createElement('div');
  modal.className = 'modal-bg open';
  modal.innerHTML = `
    <div class="modal">
      <div class="mhd"><div class="mtitle">Registrar movimiento</div>
        <button class="mclose" onclick="this.closest('.modal-bg').remove()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
      <div class="mbody"><div class="fgrid">
        <div class="fg"><label>Tipo</label><select id="m-tipo"><option value="INGRESO">Ingreso</option><option value="EGRESO">Egreso</option></select></div>
        <div class="fg"><label>Fecha</label><input type="date" id="m-fecha" value="${new Date().toISOString().slice(0,10)}"></div>
        <div class="fg full"><label>Concepto</label><input type="text" id="m-concepto" placeholder="Descripción del movimiento..."></div>
        <div class="fg"><label>Categoría</label><input type="text" id="m-cat" placeholder="Pago cuota, OC, planilla..."></div>
        <div class="fg"><label>Monto USD</label><input type="number" id="m-monto" placeholder="0.00"></div>
        <div class="fg"><label>Método</label><select id="m-metodo"><option>Transferencia</option><option>Depósito</option><option>Efectivo</option><option>Cheque</option></select></div>
        <div class="fg"><label>Referencia</label><input type="text" id="m-ref" placeholder="N° factura, comprobante..."></div>
      </div></div>
      <div class="mfoot">
        <button class="btn-sec" onclick="this.closest('.modal-bg').remove()">Cancelar</button>
        <button class="btn-pri" id="btnGuardarMov"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>Guardar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#btnGuardarMov').onclick = async () => {
    try {
      await finanzasApi.crear({
        tipo:      document.getElementById('m-tipo').value,
        fecha:     document.getElementById('m-fecha').value,
        concepto:  document.getElementById('m-concepto').value,
        categoria: document.getElementById('m-cat').value,
        montoUSD:  parseFloat(document.getElementById('m-monto').value),
        metodo:    document.getElementById('m-metodo').value,
        referencia: document.getElementById('m-ref').value,
      });
      toast('Movimiento registrado', 'ok');
      modal.remove();
      renderMovimientos(el);
    } catch(err) { toast('Error: '+err.message, 'err'); }
  };
  modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
}

function mostrarModalTC(el) {
  const modal = document.createElement('div');
  modal.className = 'modal-bg open';
  modal.innerHTML = `
    <div class="modal" style="max-width:420px">
      <div class="mhd"><div class="mtitle">Actualizar tipo de cambio</div>
        <button class="mclose" onclick="this.closest('.modal-bg').remove()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
      <div class="mbody"><div class="fgrid">
        <div class="fg"><label>Período (YYYY-MM)</label><input type="month" id="tc-periodo" value="${new Date().toISOString().slice(0,7)}"></div>
        <div class="fg"><label>TC Oficial USD→Bs</label><input type="number" id="tc-oficial" step="0.01" value="7.05"></div>
        <div class="fg"><label>TC Paralelo (opcional)</label><input type="number" id="tc-paralelo" step="0.01" placeholder="7.08"></div>
        <div class="fg"><label>Fuente</label><input type="text" id="tc-fuente" value="BCB"></div>
      </div></div>
      <div class="mfoot">
        <button class="btn-sec" onclick="this.closest('.modal-bg').remove()">Cancelar</button>
        <button class="btn-pri" id="btnGuardarTC"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>Guardar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#btnGuardarTC').onclick = async () => {
    try {
      await finanzasApi.registrarTC({
        periodo:    document.getElementById('tc-periodo').value,
        tcOficial:  parseFloat(document.getElementById('tc-oficial').value),
        tcParalelo: parseFloat(document.getElementById('tc-paralelo').value) || null,
        fuente:     document.getElementById('tc-fuente').value,
      });
      toast('Tipo de cambio actualizado', 'ok');
      modal.remove();
      renderTC(el);
    } catch(err) { toast('Error: '+err.message, 'err'); }
  };
  modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
}
