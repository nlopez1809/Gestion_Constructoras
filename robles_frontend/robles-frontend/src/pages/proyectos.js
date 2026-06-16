// src/pages/proyectos.js — Módulo Proyectos conectado al backend

import { proyectosApi } from '../api/index.js';
import { fmt, estadoPill, toast, showLoading, hideLoading } from '../utils/ui.js';

export async function initProyectos(container) {
  container.innerHTML = `
    <div class="tabs" id="proy-tabs">
      <div class="tab active" data-tab="resumen">Resumen</div>
      <div class="tab" data-tab="detalle">Detalle</div>
      <div class="tab" data-tab="etapas">Etapas</div>
      <div class="tab" data-tab="costos">Costos</div>
    </div>
    <div id="proy-content" style="padding:0 24px 24px"></div>
  `;
  container.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderProyTab(container.querySelector('#proy-content'), tab.dataset.tab);
    });
  });
  renderProyTab(container.querySelector('#proy-content'), 'resumen');
}

async function renderProyTab(el, tab) {
  try {
    showLoading();
    const proyectos = await proyectosApi.list();
    hideLoading();
    switch (tab) {
      case 'resumen': return renderResumenProy(el, proyectos);
      case 'detalle': return renderDetalleProy(el, proyectos);
      case 'etapas':  return renderEtapasProy(el, proyectos);
      case 'costos':  return renderCostosProy(el, proyectos);
    }
  } catch (err) { hideLoading(); toast('Error: ' + err.message, 'err'); }
}

function renderResumenProy(el, proyectos) {
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:13px;margin-top:20px">
      ${proyectos.map(p => `
        <div class="panel" style="cursor:pointer" onclick="">
          <div style="height:5px;background:linear-gradient(90deg,${colorProy(p.estado)});border-radius:0"></div>
          <div style="padding:16px 20px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
              <div>
                <div style="font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:600;color:var(--bark)">${p.nombre}</div>
                <div style="font-size:11px;color:var(--text-muted)">${p.ubicacion} · ${p.ciudad}</div>
              </div>
              ${estadoPill(p.estado)}
            </div>
            <div style="margin-bottom:10px">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                <span style="font-size:11.5px;color:var(--text-mid)">Avance de obra</span>
                <span style="font-size:12px;font-weight:500;color:var(--leaf)">${fmt.pct(p.avancePct)}</span>
              </div>
              <div class="prog-bar"><div class="prog-fill" style="width:${p.avancePct}%;background:${p.avancePct>=90?'var(--gold)':p.avancePct<20?'var(--blue)':'var(--leaf)'}"></div></div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px">
              <div><div style="font-size:9.5px;color:var(--text-muted);text-transform:uppercase">Unidades</div><div style="font-size:13px;font-weight:500">${p.totalUnidades}</div></div>
              <div><div style="font-size:9.5px;color:var(--text-muted);text-transform:uppercase">Vendidas</div><div style="font-size:13px;font-weight:500;color:var(--leaf)">${p.unidadesVendidas || 0}</div></div>
              <div><div style="font-size:9.5px;color:var(--text-muted);text-transform:uppercase">Presupuesto</div><div style="font-size:13px;font-weight:500">${fmt.usd(p.presupuesto)}</div></div>
            </div>
            <div style="display:flex;gap:8px;margin-top:12px">
              <div style="flex:1;background:var(--off);border-radius:8px;padding:8px 10px">
                <div style="font-size:9.5px;color:var(--text-muted)">Entrega estimada</div>
                <div style="font-size:12px;font-weight:500;color:var(--text-mid)">${fmt.fecha(p.fechaEntrega)}</div>
              </div>
              <div style="flex:1;background:var(--off);border-radius:8px;padding:8px 10px">
                <div style="font-size:9.5px;color:var(--text-muted)">Disponibles</div>
                <div style="font-size:12px;font-weight:500;color:var(--leaf)">${p.unidadesDisponibles || 0}</div>
              </div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderDetalleProy(el, proyectos) {
  el.innerHTML = `
    <div style="margin-top:20px">
      <div class="search-row">
        <select class="sel" id="sel-proy-det">
          ${proyectos.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('')}
        </select>
      </div>
      <div id="det-content"></div>
    </div>
  `;
  const sel = document.getElementById('sel-proy-det');
  const cargar = async () => {
    const det = await proyectosApi.get(sel.value);
    document.getElementById('det-content').innerHTML = `
      <div class="panel">
        <div class="ph"><div><div class="pt">${det.nombre}</div><div class="ps">${det.ubicacion} · ${det.ciudad}</div></div></div>
        <div class="pb">
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px">
            ${[
              ['Presupuesto', fmt.usd(det.presupuesto)],
              ['Ejecutado', fmt.usd(det.ejecutadoUSD || 0)],
              ['Total m²', `${det.totalM2} m²`],
              ['Avance', fmt.pct(det.avancePct)],
            ].map(([l,v]) => `
              <div style="background:var(--off);border-radius:10px;padding:12px">
                <div style="font-size:9.5px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">${l}</div>
                <div style="font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;color:var(--bark)">${v}</div>
              </div>
            `).join('')}
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
            ${(det.etapas||[]).map(e => `
              <div style="background:var(--white);border:1px solid var(--border);border-radius:10px;padding:12px">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
                  <div style="font-size:12px;font-weight:500;color:var(--bark)">${e.nombre}</div>
                  ${estadoPill(e.estado)}
                </div>
                <div class="prog-bar"><div class="prog-fill" style="width:${e.avancePct}%;background:${e.estado==='COMPLETADA'?'var(--leaf)':e.estado==='EN_CURSO'?'var(--gold)':'var(--border-dark)'}"></div></div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${fmt.pct(e.avancePct)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  };
  sel.addEventListener('change', cargar);
  cargar();
}

function renderEtapasProy(el, proyectos) {
  el.innerHTML = `
    <div style="margin-top:20px">
      <div class="search-row">
        <select class="sel" id="sel-proy-etapa">${proyectos.map(p=>`<option value="${p.id}">${p.nombre}</option>`).join('')}</select>
        <button class="btn-pri" id="btnNuevaEtapa" style="height:36px">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Nueva etapa
        </button>
      </div>
      <div id="etapas-list"></div>
    </div>
  `;
  const sel = document.getElementById('sel-proy-etapa');
  const cargar = async () => {
    const etapas = await proyectosApi.etapas(sel.value);
    const cont = document.getElementById('etapas-list');
    cont.innerHTML = `
      <div class="panel">
        <div class="tw"><table>
          <thead><tr><th>#</th><th>Etapa</th><th class="r">Avance</th><th>Estado</th><th>Inicio</th><th>Fin</th><th></th></tr></thead>
          <tbody>
            ${etapas.map(e => `
              <tr>
                <td>${e.orden}</td>
                <td><strong>${e.nombre}</strong></td>
                <td class="r">
                  <div style="display:flex;align-items:center;gap:8px;justify-content:flex-end">
                    ${fmt.pct(e.avancePct)}
                    <input type="range" min="0" max="100" value="${e.avancePct}"
                      style="width:80px" onchange="actualizarEtapa('${sel.value}','${e.id}',this.value,this)">
                  </div>
                </td>
                <td>${estadoPill(e.estado)}</td>
                <td>${fmt.fecha(e.fechaInicio)}</td>
                <td>${fmt.fecha(e.fechaFin)}</td>
                <td><button class="plink" onclick="editarEtapa('${sel.value}','${e.id}')">Editar</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table></div>
      </div>
    `;
  };
  sel.addEventListener('change', cargar);
  window.actualizarEtapa = async (proyId, etapaId, valor, input) => {
    try {
      await proyectosApi.actualizarEtapa(proyId, etapaId, { avancePct: parseFloat(valor) });
      input.previousElementSibling.textContent = fmt.pct(valor);
      toast('Avance actualizado', 'ok');
    } catch (err) { toast('Error: ' + err.message, 'err'); }
  };
  cargar();
}

async function renderCostosProy(el, proyectos) {
  el.innerHTML = `
    <div style="margin-top:20px">
      <div class="search-row">
        <select class="sel" id="sel-proy-costos">${proyectos.map(p=>`<option value="${p.id}">${p.nombre}</option>`).join('')}</select>
      </div>
      <div id="costos-det"></div>
    </div>
  `;
  const sel = document.getElementById('sel-proy-costos');
  const cargar = async () => {
    const costos = await proyectosApi.costos(sel.value);
    document.getElementById('costos-det').innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
        ${[
          ['Presupuesto', fmt.usd(costos.totalPresupuesto), 'b'],
          ['Ejecutado', fmt.usd(costos.totalEjecutado), 'gold'],
          ['Saldo', fmt.usd(costos.saldo), costos.saldo>=0?'g':'r'],
          ['% Ejecutado', fmt.pct(costos.pctEjecutado), costos.pctEjecutado>100?'r':'b'],
        ].map(([l,v,t]) => `
          <div class="kpi"><div class="kpi-top"><div class="ki ${t}"></div></div><div class="kpi-val">${v}</div><div class="kpi-lbl">${l}</div></div>
        `).join('')}
      </div>
      <div class="panel">
        <div class="ph"><div><div class="pt">Desglose por categoría</div></div></div>
        <div class="pb">
          ${costos.porCategoria.map(c => `
            <div style="margin-bottom:12px">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                <span style="font-size:12.5px;font-weight:500;color:var(--bark)">${c.categoria}</span>
                <span style="font-size:12px;font-weight:500;color:${c.ejecutado>c.presupuestado?'var(--red)':'var(--text-mid)'}">
                  ${fmt.usd(c.ejecutado)} / ${fmt.usd(c.presupuestado)}
                </span>
              </div>
              <div class="prog-bar"><div class="prog-fill" style="width:${Math.min((c.ejecutado/Math.max(c.presupuestado,1))*100,100)}%;background:${c.ejecutado>c.presupuestado?'var(--red)':c.ejecutado/Math.max(c.presupuestado,1)>0.8?'var(--gold)':'var(--leaf)'}"></div></div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };
  sel.addEventListener('change', cargar);
  cargar();
}

function colorProy(estado) {
  const m = {
    EN_OBRA: 'var(--leaf),var(--leaf-light)',
    EN_PLANIFICACION: 'var(--blue),#7a9ce8',
    ENTREGADO: 'var(--bark-mid),var(--bark-pale)',
    PAUSADO: 'var(--text-muted),var(--border-dark)',
  };
  return m[estado] || 'var(--border-dark),var(--border)';
}
