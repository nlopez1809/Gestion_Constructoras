// src/pages/proyectos.js — Módulo Proyectos conectado al backend

import { proyectosApi, unidadesApi } from '../api/index.js';
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
        <div class="panel proy-card" style="cursor:pointer" data-proy-id="${p.id}">
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

  el.querySelectorAll('.proy-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.proyId;
      const tabs = document.getElementById('proy-tabs');
      tabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      const detTab = tabs.querySelector('[data-tab="detalle"]');
      detTab.classList.add('active');
      renderDetalleProyById(el, id);
    });
  });
}

async function renderDetalleProyById(el, proyId) {
  try {
    showLoading();
    const proyectos = await proyectosApi.list();
    hideLoading();
    renderDetalleProy(el, proyectos, proyId);
  } catch (err) { hideLoading(); toast('Error: ' + err.message, 'err'); }
}

function renderDetalleProy(el, proyectos, selectedId) {
  el.innerHTML = `
    <div style="margin-top:20px">
      <div class="search-row">
        <select class="sel" id="sel-proy-det">
          ${proyectos.map(p => `<option value="${p.id}"${p.id===selectedId?' selected':''}>${p.nombre}</option>`).join('')}
        </select>
      </div>
      <div id="det-content"></div>
    </div>
  `;
  const sel = document.getElementById('sel-proy-det');
  const cargar = async () => {
    const [det, unidades] = await Promise.all([
      proyectosApi.get(sel.value),
      unidadesApi.list({ proyectoId: sel.value })
    ]);
    const tipoLabel = { DEPARTAMENTO:'Departamento', PENTHOUSE:'Penthouse', LOCAL_COMERCIAL:'Local comercial', ESTACIONAMIENTO:'Estacionamiento', OFICINA:'Oficina' };
    const estadoColor = { DISPONIBLE:'var(--leaf)', RESERVADO:'var(--gold)', VENDIDO:'var(--blue)', NO_DISPONIBLE:'var(--text-muted)' };
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

      <div class="panel" style="margin-top:14px">
        <div class="ph">
          <div><div class="pt">Mapa de unidades</div><div class="ps">Departamentos, locales comerciales y oficinas</div></div>
          <div style="display:flex;align-items:center;gap:14px">
            <div style="display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:3px;background:#4a8a30;display:inline-block"></span><span style="font-size:10px;color:var(--text-muted)">Disponible</span></div>
            <div style="display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:3px;background:#d4a017;display:inline-block"></span><span style="font-size:10px;color:var(--text-muted)">Reservado</span></div>
            <div style="display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:3px;background:#c0392b;display:inline-block"></span><span style="font-size:10px;color:var(--text-muted)">Vendido</span></div>
            <div style="display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:3px;background:#bbb;display:inline-block"></span><span style="font-size:10px;color:var(--text-muted)">No disponible</span></div>
            <button class="btn-pri" id="btnNuevaUnidad" style="height:36px;margin-left:8px">
              <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Nueva unidad
            </button>
          </div>
        </div>
        <div class="pb">
          ${unidades.length === 0
            ? '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:12.5px">Sin unidades registradas. Agregue unidades con el botón +</div>'
            : renderMapaUnidades(unidades, tipoLabel)
          }
        </div>
      </div>
    `;

    document.getElementById('btnNuevaUnidad').addEventListener('click', () => {
      const modal = document.getElementById('globalModal');
      const title = document.getElementById('modal-title');
      const body  = document.getElementById('modal-body');
      if (!modal || !body) return;

      const is = 'width:100%;background:var(--off);border:1px solid var(--border);border-radius:8px;padding:9px 12px;font-size:13px;font-family:"DM Sans",sans-serif;color:var(--text);outline:none;';
      const ls = 'font-size:10px;font-weight:500;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;display:block;';
      const fg = 'margin-bottom:12px;';
      const rw = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;';
      const bs = 'width:100%;background:var(--bark);color:white;border:none;border-radius:10px;padding:12px;font-size:13px;font-weight:500;cursor:pointer;font-family:"DM Sans",sans-serif;margin-top:8px;';

      title.textContent = 'Nueva unidad';
      body.innerHTML = `<form id="frmUnidad">
        <div style="${rw}">
          <div style="${fg}"><label style="${ls}">Código</label><input style="${is}" name="codigo" placeholder="Ej: 3B, PH1, LC2" required></div>
          <div style="${fg}"><label style="${ls}">Tipo</label><select style="${is}" name="tipo">
            <option value="DEPARTAMENTO">Departamento</option>
            <option value="LOCAL_COMERCIAL">Local comercial</option>
            <option value="OFICINA">Oficina</option>
            <option value="PENTHOUSE">Penthouse</option>
            <option value="ESTACIONAMIENTO">Estacionamiento</option>
          </select></div>
        </div>
        <div style="${rw}">
          <div style="${fg}"><label style="${ls}">Piso</label><input style="${is}" name="piso" type="number" min="0" value="1" required></div>
          <div style="${fg}"><label style="${ls}">Metros cuadrados</label><input style="${is}" name="m2" type="number" step="0.01" min="0" required></div>
        </div>
        <div style="${fg}"><label style="${ls}">Precio base (USD)</label><input style="${is}" name="precioBase" type="number" step="0.01" min="0" required></div>
        <button type="submit" style="${bs}">Crear unidad</button>
      </form>`;

      document.getElementById('frmUnidad').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          showLoading('Creando unidad...');
          await unidadesApi.create({
            proyectoId: sel.value,
            codigo: fd.get('codigo'),
            tipo: fd.get('tipo'),
            piso: +fd.get('piso'),
            m2: +fd.get('m2'),
            precioBase: +fd.get('precioBase')
          });
          hideLoading();
          toast('Unidad creada', 'ok');
          modal.classList.remove('open');
          cargar();
        } catch (err) { hideLoading(); toast('Error: ' + err.message, 'err'); }
      };
      modal.classList.add('open');
    });

    document.querySelectorAll('.unidad-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const uid = cell.dataset.uid;
        const u = unidades.find(x => x.id === uid);
        if (!u) return;
        const modal = document.getElementById('globalModal');
        const title = document.getElementById('modal-title');
        const body  = document.getElementById('modal-body');
        if (!modal || !body) return;
        const mapColor = { DISPONIBLE:'#4a8a30', RESERVADO:'#d4a017', VENDIDO:'#c0392b', NO_DISPONIBLE:'#bbb' };
        const estadoLbl = { DISPONIBLE:'Disponible', RESERVADO:'Reservado', VENDIDO:'Vendido', NO_DISPONIBLE:'No disponible' };
        title.textContent = `Unidad ${u.codigo}`;
        body.innerHTML = `
          <div style="text-align:center;margin-bottom:16px">
            <span style="display:inline-block;padding:6px 18px;border-radius:20px;font-size:13px;font-weight:600;color:white;background:${mapColor[u.estado]}">${estadoLbl[u.estado]||u.estado}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
            <div style="background:var(--off);border-radius:10px;padding:12px"><div style="font-size:9.5px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Tipo</div><div style="font-size:14px;font-weight:500;color:var(--bark)">${tipoLabel[u.tipo]||u.tipo}</div></div>
            <div style="background:var(--off);border-radius:10px;padding:12px"><div style="font-size:9.5px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Piso</div><div style="font-size:14px;font-weight:500;color:var(--bark)">${u.piso}</div></div>
            <div style="background:var(--off);border-radius:10px;padding:12px"><div style="font-size:9.5px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Superficie</div><div style="font-size:14px;font-weight:500;color:var(--bark)">${u.m2} m²</div></div>
            <div style="background:var(--off);border-radius:10px;padding:12px"><div style="font-size:9.5px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Precio</div><div style="font-size:14px;font-weight:500;color:var(--bark)">${fmt.usd(u.precioBase)}</div></div>
          </div>
          ${u.estado === 'DISPONIBLE' ? `<button id="btnReservarU" style="width:100%;background:#d4a017;color:white;border:none;border-radius:10px;padding:12px;font-size:13px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;">Reservar unidad</button>` : ''}
          ${u.estado === 'RESERVADO' ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <button id="btnVenderU" style="background:#c0392b;color:white;border:none;border-radius:10px;padding:12px;font-size:13px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;">Marcar vendido</button>
            <button id="btnLiberarU" style="background:#4a8a30;color:white;border:none;border-radius:10px;padding:12px;font-size:13px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;">Liberar</button>
          </div>` : ''}
        `;
        const cambiarEstado = async (nuevoEstado) => {
          try {
            showLoading('Actualizando...');
            await unidadesApi.cambiarEstado(u.id, nuevoEstado);
            hideLoading(); toast('Estado actualizado', 'ok');
            modal.classList.remove('open');
            cargar();
          } catch(err) { hideLoading(); toast('Error: '+err.message,'err'); }
        };
        if (document.getElementById('btnReservarU')) document.getElementById('btnReservarU').onclick = () => cambiarEstado('RESERVADO');
        if (document.getElementById('btnVenderU')) document.getElementById('btnVenderU').onclick = () => cambiarEstado('VENDIDO');
        if (document.getElementById('btnLiberarU')) document.getElementById('btnLiberarU').onclick = () => cambiarEstado('DISPONIBLE');
        modal.classList.add('open');
      });
    });
  };
  sel.addEventListener('change', cargar);
  cargar();
}

function renderMapaUnidades(unidades, tipoLabel) {
  const mapColor = { DISPONIBLE:'#4a8a30', RESERVADO:'#d4a017', VENDIDO:'#c0392b', NO_DISPONIBLE:'#bbb' };
  const mapBg    = { DISPONIBLE:'#e8f5e1', RESERVADO:'#fef9e7', VENDIDO:'#fde8e8', NO_DISPONIBLE:'#f0f0f0' };
  const tipoIcon = { DEPARTAMENTO:'🏢', PENTHOUSE:'🏠', LOCAL_COMERCIAL:'🏪', OFICINA:'🏛️', ESTACIONAMIENTO:'🅿️' };

  const pisos = {};
  unidades.forEach(u => {
    if (!pisos[u.piso]) pisos[u.piso] = [];
    pisos[u.piso].push(u);
  });
  const pisosOrdenados = Object.keys(pisos).map(Number).sort((a, b) => b - a);

  return `
    <div style="border:1px solid var(--border);border-radius:12px;overflow:hidden;background:#fafaf8">
      ${pisosOrdenados.map(piso => `
        <div style="display:flex;border-bottom:1px solid var(--border)">
          <div style="min-width:60px;padding:12px;background:var(--off);display:flex;align-items:center;justify-content:center;border-right:1px solid var(--border)">
            <span style="font-size:11px;font-weight:600;color:var(--bark)">Piso ${piso}</span>
          </div>
          <div style="flex:1;padding:10px;display:flex;flex-wrap:wrap;gap:8px">
            ${pisos[piso].map(u => `
              <div class="unidad-cell" data-uid="${u.id}" style="
                min-width:100px;flex:1;max-width:160px;
                background:${mapBg[u.estado]||'#f0f0f0'};
                border:2px solid ${mapColor[u.estado]||'#bbb'};
                border-radius:10px;padding:10px 12px;cursor:pointer;
                transition:transform .15s,box-shadow .15s;
                position:relative;
              " onmouseover="this.style.transform='scale(1.04)';this.style.boxShadow='0 4px 12px rgba(0,0,0,.12)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                  <span style="font-size:14px;font-weight:700;color:${mapColor[u.estado]}">${u.codigo}</span>
                  <span style="font-size:16px">${tipoIcon[u.tipo]||'📦'}</span>
                </div>
                <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px">${tipoLabel[u.tipo]||u.tipo}</div>
                <div style="font-size:10.5px;color:var(--text-mid)">${u.m2} m² · ${fmt.usd(u.precioBase)}</div>
                <div style="position:absolute;top:6px;right:8px;width:8px;height:8px;border-radius:50%;background:${mapColor[u.estado]}"></div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
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

  document.getElementById('btnNuevaEtapa').addEventListener('click', () => {
    const proyId = sel.value;
    const modal = document.getElementById('globalModal');
    const title = document.getElementById('modal-title');
    const body  = document.getElementById('modal-body');
    if (!modal || !body) return;

    const is = 'width:100%;background:var(--off);border:1px solid var(--border);border-radius:8px;padding:9px 12px;font-size:13px;font-family:"DM Sans",sans-serif;color:var(--text);outline:none;';
    const ls = 'font-size:10px;font-weight:500;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;display:block;';
    const fg = 'margin-bottom:12px;';
    const rw = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;';
    const bs = 'width:100%;background:var(--bark);color:white;border:none;border-radius:10px;padding:12px;font-size:13px;font-weight:500;cursor:pointer;font-family:"DM Sans",sans-serif;margin-top:8px;';

    title.textContent = 'Nueva etapa de obra';
    body.innerHTML = `<form id="frmEtapa">
      <div style="${fg}"><label style="${ls}">Nombre de la etapa</label><input style="${is}" name="nombre" placeholder="Excavación, Estructura, Acabados..." required></div>
      <div style="${rw}">
        <div style="${fg}"><label style="${ls}">Orden</label><input style="${is}" name="orden" type="number" min="1" value="1" required></div>
        <div style="${fg}"><label style="${ls}">Avance inicial %</label><input style="${is}" name="avancePct" type="number" min="0" max="100" value="0"></div>
      </div>
      <div style="${rw}">
        <div style="${fg}"><label style="${ls}">Fecha inicio</label><input style="${is}" name="fechaInicio" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
        <div style="${fg}"><label style="${ls}">Fecha fin (estimada)</label><input style="${is}" name="fechaFin" type="date"></div>
      </div>
      <div style="${fg}"><label style="${ls}">Estado</label><select style="${is}" name="estado"><option value="PENDIENTE">Pendiente</option><option value="EN_CURSO">En curso</option><option value="COMPLETADA">Completada</option></select></div>
      <button type="submit" style="${bs}">Crear etapa</button>
    </form>`;

    document.getElementById('frmEtapa').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        showLoading('Creando etapa...');
        await proyectosApi.crearEtapa(proyId, {
          nombre: fd.get('nombre'),
          orden: +fd.get('orden'),
          avancePct: +fd.get('avancePct'),
          estado: fd.get('estado'),
          fechaInicio: fd.get('fechaInicio') || undefined,
          fechaFin: fd.get('fechaFin') || undefined
        });
        hideLoading();
        toast('Etapa creada', 'ok');
        modal.classList.remove('open');
        cargar();
      } catch (err) { hideLoading(); toast('Error: ' + err.message, 'err'); }
    };
    modal.classList.add('open');
  });

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
