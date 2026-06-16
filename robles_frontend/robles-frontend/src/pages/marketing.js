// src/pages/marketing.js — Marketing conectado al backend
import { campanasApi, leadsApi } from '../api/index.js';
import { fmt, estadoPill, toast, showLoading, hideLoading, renderTable, debounce } from '../utils/ui.js';

export async function initMarketing(container) {
  container.innerHTML = `
    <div class="tabs">
      <div class="tab active" data-tab="resumen">Resumen</div>
      <div class="tab" data-tab="campanas">Campañas</div>
      <div class="tab" data-tab="leads">Leads</div>
      <div class="tab" data-tab="conversion">Conversiones</div>
      <div class="tab" data-tab="canales">Efectividad por canal</div>
    </div>
    <div id="mkt-content" style="padding:0 24px 24px"></div>
  `;
  container.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderMktTab(container.querySelector('#mkt-content'), tab.dataset.tab);
    });
  });
  renderMktTab(container.querySelector('#mkt-content'), 'resumen');
}

async function renderMktTab(el, tab) {
  switch(tab) {
    case 'resumen':    return renderResumenMkt(el);
    case 'campanas':   return renderCampanas(el);
    case 'leads':      return renderLeads(el);
    case 'conversion': return renderConversion(el);
    case 'canales':    return renderCanales(el);
  }
}

async function renderResumenMkt(el) {
  try {
    showLoading();
    const [resumen, embudo] = await Promise.all([
      campanasApi.resumen(),
      leadsApi.embudo()
    ]);
    hideLoading();
    el.innerHTML = `
      <div class="kpi-row" style="margin-top:20px">
        <div class="kpi"><div class="kpi-top"><div class="ki pu"><svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div><div class="trend fl">Activas</div></div><div class="kpi-val">${resumen.leadsTotal}</div><div class="kpi-lbl">Leads generados</div></div>
        <div class="kpi"><div class="kpi-top"><div class="ki b"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div><div class="trend up">↑</div></div><div class="kpi-val">${resumen.leadsConvertidos}</div><div class="kpi-lbl">Leads convertidos</div></div>
        <div class="kpi"><div class="kpi-top"><div class="ki g"><svg viewBox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 1 18"/></svg></div><div class="trend up">↑ Conversión</div></div><div class="kpi-val">${fmt.pct(resumen.tasaConversion)}</div><div class="kpi-lbl">Tasa de conversión</div></div>
        <div class="kpi"><div class="kpi-top"><div class="ki gold"><svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div><div class="trend fl">Mes</div></div><div class="kpi-val">${fmt.usd(resumen.inversionMes)}</div><div class="kpi-lbl">Inversión del mes</div></div>
      </div>

      <!-- Leads por canal -->
      <div class="g2">
        <div class="panel">
          <div class="ph"><div><div class="pt">Leads por canal — Mes actual</div></div></div>
          <div class="pb">
            ${resumen.porCanal.map(c => `
              <div style="margin-bottom:10px">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                  <span style="font-size:12px;font-weight:500;color:var(--text-mid)">${canalLabel(c.canal)}</span>
                  <span style="font-size:12px;font-weight:500;color:var(--bark)">${c.total} leads</span>
                </div>
                <div class="prog-bar"><div class="prog-fill" style="width:${resumen.leadsTotal>0?(c.total/resumen.leadsTotal*100):0}%;background:${canalColor(c.canal)}"></div></div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Embudo -->
        <div class="panel">
          <div class="ph"><div><div class="pt">Embudo de conversión</div><div class="ps">${embudo.total} leads totales</div></div></div>
          <div style="display:flex;flex-direction:column;gap:8px;padding:0 20px 18px">
            ${embudo.etapas.map(e => `
              <div style="display:flex;align-items:center;gap:10px">
                <div style="width:120px;font-size:12px;color:var(--text-mid);font-weight:500;flex-shrink:0">${e.label}</div>
                <div style="flex:1">
                  <div style="height:24px;border-radius:6px;display:flex;align-items:center;padding:0 10px;font-size:10.5px;font-weight:600;color:white;background:${etapaColor(e.etapa)};min-width:20px;transition:width .6s;width:${Math.max(e.pct,5)}%">${e.count > 0 ? e.count : ''}</div>
                </div>
                <div style="font-size:11px;color:var(--text-muted);width:38px;text-align:right;flex-shrink:0">${fmt.pct(e.pct)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  } catch(err) { hideLoading(); toast('Error: '+err.message,'err'); }
}

async function renderCampanas(el) {
  try {
    showLoading();
    const campanas = await campanasApi.list();
    hideLoading();
    el.innerHTML = `
      <div class="search-row" style="margin-top:20px">
        <select class="sel" id="filtroEstCamp">
          <option value="">Todos los estados</option>
          <option value="ACTIVA">Activa</option>
          <option value="PAUSADA">Pausada</option>
          <option value="FINALIZADA">Finalizada</option>
        </select>
        <select class="sel" id="filtroCanal">
          <option value="">Todos los canales</option>
          ${['FACEBOOK_ADS','WHATSAPP','INSTAGRAM','GOOGLE_ADS','REFERIDOS'].map(c=>`<option value="${c}">${canalLabel(c)}</option>`).join('')}
        </select>
        <button class="btn-pri" style="height:36px" id="btnNuevaCamp">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Nueva campaña
        </button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:13px">
        ${campanas.map(c => `
          <div style="background:var(--white);border:1px solid var(--border);border-radius:14px;overflow:hidden;cursor:pointer;transition:all .2s" onmouseover="this.style.boxShadow='0 4px 18px rgba(61,31,10,.08)';this.style.transform='translateY(-1px)'" onmouseout="this.style.boxShadow='';this.style.transform=''">
            <div style="height:5px;background:${canalGradient(c.canal)}"></div>
            <div style="padding:14px 16px">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
                <div style="font-size:10.5px;color:var(--text-muted)">${canalLabel(c.canal)}</div>
                ${estadoPill(c.estado)}
              </div>
              <div style="font-family:'Cormorant Garamond',serif;font-size:15px;font-weight:600;color:var(--bark);margin-bottom:2px">${c.nombre}</div>
              <div style="font-size:10.5px;color:var(--text-muted);margin-bottom:10px">${c.objetivo}</div>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
                <div><div style="font-size:9px;color:var(--text-muted)">Inversión</div><div style="font-size:12.5px;font-weight:500;color:var(--bark)">${fmt.usd(c.gastado)}</div></div>
                <div><div style="font-size:9px;color:var(--text-muted)">Leads</div><div style="font-size:12.5px;font-weight:500;color:var(--leaf)">${c.totalLeads}</div></div>
                <div><div style="font-size:9px;color:var(--text-muted)">ROAS</div><div style="font-size:12.5px;font-weight:500;color:var(--leaf)">x${Math.round(c.roas)}</div></div>
                <div><div style="font-size:9px;color:var(--text-muted)">Conversiones</div><div style="font-size:12.5px;font-weight:500">${c.conversiones}</div></div>
                <div><div style="font-size:9px;color:var(--text-muted)">Conv. rate</div><div style="font-size:12.5px;font-weight:500">${fmt.pct(c.tasaConversion)}</div></div>
                <div><div style="font-size:9px;color:var(--text-muted)">Costo/lead</div><div style="font-size:12.5px;font-weight:500">${fmt.usd(c.costoPorLead)}</div></div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    document.getElementById('btnNuevaCamp').onclick = () => mostrarModalCampana(el);
  } catch(err) { hideLoading(); toast('Error: '+err.message,'err'); }
}

async function renderLeads(el) {
  try {
    showLoading();
    const data = await leadsApi.list({ limit: 20 });
    hideLoading();
    el.innerHTML = `
      <div class="search-row" style="margin-top:20px">
        <div class="search-box">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="buscarLead" placeholder="Buscar lead por nombre, teléfono...">
        </div>
        <select class="sel" id="filtroEstadoLead">
          <option value="">Todos los estados</option>
          ${['NUEVO','CONTACTADO','INTERESADO','EN_NEGOCIACION','CONVERTIDO','PERDIDO'].map(e=>`<option value="${e}">${e.replace('_',' ')}</option>`).join('')}
        </select>
        <select class="sel" id="filtroCanal">
          <option value="">Todos los canales</option>
          ${['FACEBOOK_ADS','WHATSAPP','INSTAGRAM','REFERIDOS','WEB'].map(c=>`<option value="${c}">${canalLabel(c)}</option>`).join('')}
        </select>
        <button class="btn-pri" style="height:36px" id="btnNuevoLead">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Nuevo lead
        </button>
      </div>
      <div class="panel"><div id="tablaLeads"></div><div id="paginaLeads"></div></div>
    `;

    const cargar = async () => {
      const params = { limit: 20 };
      const canal   = document.getElementById('filtroCanal').value;
      const estado  = document.getElementById('filtroEstadoLead').value;
      const q       = document.getElementById('buscarLead').value;
      if (canal)  params.canal  = canal;
      if (estado) params.estado = estado;
      if (q)      params.q      = q;
      const d = await leadsApi.list(params);
      renderTable(document.getElementById('tablaLeads'), [
        { header: 'Lead',     render: l => `<strong>${fmt.nombre(l)}</strong>` },
        { header: 'Teléfono', key: 'telefono' },
        { header: 'Canal',    render: l => `<span style="background:${canalBg(l.canal)};color:${canalColor(l.canal)};padding:2px 9px;border-radius:20px;font-size:10px;font-weight:500">${canalLabel(l.canal)}</span>` },
        { header: 'Campaña',  render: l => l.campana?.nombre || '—' },
        { header: 'Interés',  key: 'proyectoInteres', render: l => l.proyectoInteres || '—' },
        { header: 'Vendedor', render: l => l.vendedor?.nombre || '—' },
        { header: 'Fecha',    render: l => fmt.fecha(l.fechaContacto) },
        { header: 'Estado',   render: l => estadoPill(l.estado) },
        { header: '',         render: l => `<select style="font-size:10.5px;background:var(--off);border:1px solid var(--border);border-radius:6px;padding:3px 6px;cursor:pointer" onchange="cambiarEstadoLead('${l.id}',this.value)">
          <option value="">Cambiar estado</option>
          ${['CONTACTADO','INTERESADO','EN_NEGOCIACION','CONVERTIDO','PERDIDO'].map(e=>`<option value="${e}">${e.replace('_',' ')}</option>`).join('')}
        </select>` },
      ], d.leads, 'Sin leads');
    };

    document.getElementById('buscarLead').addEventListener('input', debounce(cargar, 350));
    document.getElementById('filtroEstadoLead').addEventListener('change', cargar);
    document.getElementById('filtroCanal').addEventListener('change', cargar);
    document.getElementById('btnNuevoLead').onclick = () => mostrarModalLead(el);
    window.cambiarEstadoLead = async (id, estado) => {
      if (!estado) return;
      try {
        await leadsApi.cambiarEstado(id, { estado });
        toast('Estado actualizado', 'ok');
        cargar();
      } catch(err) { toast('Error: '+err.message,'err'); }
    };
    cargar();
  } catch(err) { hideLoading(); toast('Error: '+err.message,'err'); }
}

async function renderConversion(el) {
  try {
    showLoading();
    const embudo = await leadsApi.embudo();
    hideLoading();
    el.innerHTML = `
      <div class="kpi-row" style="margin-top:20px">
        <div class="kpi"><div class="kpi-top"><div class="ki g"></div><div class="trend up">↑</div></div><div class="kpi-val">${fmt.pct(embudo.etapas[embudo.etapas.length-1]?.pct||0)}</div><div class="kpi-lbl">Tasa conversión total</div></div>
        <div class="kpi"><div class="kpi-top"><div class="ki b"></div><div class="trend fl">Total</div></div><div class="kpi-val">${embudo.total}</div><div class="kpi-lbl">Leads generados</div></div>
        <div class="kpi"><div class="kpi-top"><div class="ki gold"></div><div class="trend fl">Perdidos</div></div><div class="kpi-val">${embudo.perdidos}</div><div class="kpi-lbl">Leads perdidos</div></div>
      </div>
      <div class="panel">
        <div class="ph"><div><div class="pt">Embudo de conversión detallado</div><div class="ps">${embudo.total} leads en el período</div></div></div>
        <div style="display:flex;flex-direction:column;gap:10px;padding:0 20px 20px">
          ${embudo.etapas.map(e => `
            <div style="display:flex;align-items:center;gap:14px">
              <div style="width:140px;font-size:12.5px;font-weight:500;color:var(--text-mid);flex-shrink:0">${e.label}</div>
              <div style="flex:1">
                <div style="height:28px;border-radius:7px;display:flex;align-items:center;padding:0 12px;font-size:11px;font-weight:600;color:white;background:${etapaColor(e.etapa)};min-width:30px;width:${Math.max(e.pct,3)}%">${e.count}</div>
              </div>
              <div style="font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:var(--bark);width:40px;text-align:right;flex-shrink:0">${e.count}</div>
              <div style="font-size:11px;color:var(--text-muted);width:44px;flex-shrink:0">${fmt.pct(e.pct)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch(err) { hideLoading(); toast('Error: '+err.message,'err'); }
}

async function renderCanales(el) {
  try {
    showLoading();
    const campanas = await campanasApi.list();
    hideLoading();
    // Agrupar por canal
    const porCanal = {};
    campanas.forEach(c => {
      if (!porCanal[c.canal]) porCanal[c.canal] = { canal: c.canal, inversion: 0, leads: 0, conversiones: 0 };
      porCanal[c.canal].inversion    += c.gastado;
      porCanal[c.canal].leads        += c.totalLeads;
      porCanal[c.canal].conversiones += c.conversiones;
    });
    const canales = Object.values(porCanal).map(c => ({
      ...c,
      tasaConversion: c.leads > 0 ? (c.conversiones / c.leads) * 100 : 0,
      costoPorLead: c.leads > 0 ? c.inversion / c.leads : 0,
      roas: c.inversion > 0 ? (c.conversiones * 80000) / c.inversion : 0,
      efectividad: c.leads > 0 && (c.conversiones/c.leads) >= 0.25 ? 'EXCELENTE'
                 : c.leads > 0 && (c.conversiones/c.leads) >= 0.15 ? 'BUENO'
                 : c.leads > 0 && (c.conversiones/c.leads) >= 0.10 ? 'REGULAR' : 'BAJO'
    })).sort((a,b) => b.tasaConversion - a.tasaConversion);

    el.innerHTML = `
      <div class="panel" style="margin-top:20px">
        <div class="ph"><div><div class="pt">Efectividad por canal de marketing</div><div class="ps">Inversión, leads, conversiones y ROAS</div></div></div>
        <div class="tw"><table>
          <thead><tr><th>Canal</th><th class="r">Inversión</th><th class="r">Leads</th><th class="r">Costo/lead</th><th class="r">Conversiones</th><th class="r">Tasa conv.</th><th class="r">ROAS</th><th>Efectividad</th></tr></thead>
          <tbody>
            ${canales.map((c,i)=>`
              <tr style="background:${i%2===1?'var(--off)':'var(--white)'}">
                <td><div style="display:flex;align-items:center;gap:8px"><div style="width:10px;height:10px;border-radius:50%;background:${canalColor(c.canal)};flex-shrink:0"></div><strong>${canalLabel(c.canal)}</strong></div></td>
                <td class="r">${fmt.usd(c.inversion)}</td>
                <td class="r">${c.leads}</td>
                <td class="r">${fmt.usd(c.costoPorLead)}</td>
                <td class="r" style="color:var(--leaf);font-weight:500">${c.conversiones}</td>
                <td class="r" style="color:${c.tasaConversion>=20?'var(--leaf)':c.tasaConversion>=10?'var(--gold)':'var(--red)'};font-weight:600">${fmt.pct(c.tasaConversion)}</td>
                <td class="r" style="color:var(--leaf);font-weight:600">x${Math.round(c.roas)}</td>
                <td><span style="background:${c.efectividad==='EXCELENTE'?'var(--leaf-pale)':c.efectividad==='BUENO'?'var(--leaf-pale)':c.efectividad==='REGULAR'?'var(--warn-bg)':'var(--red-bg)'};color:${c.efectividad==='EXCELENTE'||c.efectividad==='BUENO'?'var(--leaf)':c.efectividad==='REGULAR'?'var(--gold)':'var(--red)'};padding:2px 9px;border-radius:20px;font-size:10px;font-weight:500">${c.efectividad}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table></div>
      </div>
    `;
  } catch(err) { hideLoading(); toast('Error: '+err.message,'err'); }
}

// ── HELPERS DE CANAL ──
function canalLabel(c) {
  return { FACEBOOK_ADS:'Facebook Ads', WHATSAPP:'WhatsApp', INSTAGRAM:'Instagram', GOOGLE_ADS:'Google Ads', REFERIDOS:'Referidos', WEB:'Web/Otros', OTRO:'Otro' }[c] || c;
}
function canalColor(c) {
  return { FACEBOOK_ADS:'#1877f2', WHATSAPP:'#25d366', INSTAGRAM:'#e1306c', GOOGLE_ADS:'#4285f4', REFERIDOS:'var(--bark-mid)', WEB:'var(--teal,#1a8a7a)', OTRO:'var(--text-muted)' }[c] || 'var(--text-muted)';
}
function canalBg(c) {
  return { FACEBOOK_ADS:'#e7f0fd', WHATSAPP:'#e7faf0', INSTAGRAM:'#fde8f0', GOOGLE_ADS:'var(--blue-bg)', REFERIDOS:'#f0ebe4', WEB:'var(--teal-bg,#e0f5f2)' }[c] || 'var(--off)';
}
function canalGradient(c) {
  return { FACEBOOK_ADS:'linear-gradient(90deg,#1877f2,#42adf5)', WHATSAPP:'linear-gradient(90deg,#25d366,#128c7e)', INSTAGRAM:'linear-gradient(90deg,#e1306c,#f77737,#fcaf45)', GOOGLE_ADS:'linear-gradient(90deg,#4285f4,#ea4335)', REFERIDOS:'linear-gradient(90deg,var(--bark-mid),var(--bark-pale))' }[c] || 'linear-gradient(90deg,var(--border-dark),var(--border))';
}
function etapaColor(e) {
  return { NUEVO:'var(--blue)', CONTACTADO:'#3a7abf', INTERESADO:'var(--bark-light)', EN_NEGOCIACION:'var(--bark-mid)', CONVERTIDO:'var(--leaf)' }[e] || 'var(--text-muted)';
}

function mostrarModalLead(el) {
  const modal = document.createElement('div');
  modal.className = 'modal-bg open';
  modal.innerHTML = `
    <div class="modal">
      <div class="mhd"><div class="mtitle">Registrar nuevo lead</div>
        <button class="mclose" onclick="this.closest('.modal-bg').remove()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
      <div class="mbody"><div class="fgrid">
        <div class="fg"><label>Nombre</label><input type="text" id="l-nombre" placeholder="Nombre"></div>
        <div class="fg"><label>Apellido</label><input type="text" id="l-apellido" placeholder="Apellido"></div>
        <div class="fg"><label>Teléfono / WhatsApp</label><input type="text" id="l-tel" placeholder="+591 7..."></div>
        <div class="fg"><label>Email</label><input type="email" id="l-email" placeholder="correo@email.com"></div>
        <div class="fg"><label>Canal de origen</label><select id="l-canal">${['FACEBOOK_ADS','WHATSAPP','INSTAGRAM','GOOGLE_ADS','REFERIDOS','WEB'].map(c=>`<option value="${c}">${canalLabel(c)}</option>`).join('')}</select></div>
        <div class="fg"><label>Proyecto de interés</label><input type="text" id="l-proy" placeholder="Torre Roble II, Jardines..."></div>
        <div class="fg full"><label>Observaciones</label><textarea id="l-obs" rows="2" placeholder="Consulta específica, presupuesto estimado..."></textarea></div>
      </div></div>
      <div class="mfoot">
        <button class="btn-sec" onclick="this.closest('.modal-bg').remove()">Cancelar</button>
        <button class="btn-pri" id="btnGuardarLead"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>Registrar lead</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#btnGuardarLead').onclick = async () => {
    const nombre = document.getElementById('l-nombre').value.trim();
    const tel    = document.getElementById('l-tel').value.trim();
    if (!nombre || !tel) { toast('Nombre y teléfono son obligatorios', 'warn'); return; }
    try {
      await leadsApi.create({
        nombre,
        apellido: document.getElementById('l-apellido').value.trim() || null,
        telefono: tel,
        email:    document.getElementById('l-email').value.trim() || null,
        canal:    document.getElementById('l-canal').value,
        proyectoInteres: document.getElementById('l-proy').value || null,
        observacion: document.getElementById('l-obs').value || null,
      });
      toast('Lead registrado', 'ok');
      modal.remove();
      renderLeads(el);
    } catch(err) { toast('Error: '+err.message,'err'); }
  };
  modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
}

function mostrarModalCampana(el) {
  const modal = document.createElement('div');
  modal.className = 'modal-bg open';
  modal.innerHTML = `
    <div class="modal">
      <div class="mhd"><div class="mtitle">Nueva campaña de marketing</div>
        <button class="mclose" onclick="this.closest('.modal-bg').remove()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
      <div class="mbody"><div class="fgrid">
        <div class="fg full"><label>Nombre de la campaña</label><input type="text" id="cp-nombre" placeholder="Ej: Torre Roble II — Lanzamiento"></div>
        <div class="fg"><label>Canal</label><select id="cp-canal">${['FACEBOOK_ADS','WHATSAPP','INSTAGRAM','GOOGLE_ADS','REFERIDOS'].map(c=>`<option value="${c}">${canalLabel(c)}</option>`).join('')}</select></div>
        <div class="fg"><label>Objetivo</label><select id="cp-obj"><option>Generación de leads</option><option>Reconocimiento</option><option>Retención de clientes</option><option>Pre-venta</option></select></div>
        <div class="fg"><label>Presupuesto (USD)</label><input type="number" id="cp-ppto" placeholder="0.00"></div>
        <div class="fg"><label>Meta de leads</label><input type="number" id="cp-meta" placeholder="50"></div>
        <div class="fg"><label>Fecha de inicio</label><input type="date" id="cp-inicio" value="${new Date().toISOString().slice(0,10)}"></div>
        <div class="fg full"><label>Descripción</label><textarea id="cp-desc" rows="2" placeholder="Propuesta de valor, segmento objetivo..."></textarea></div>
      </div></div>
      <div class="mfoot">
        <button class="btn-sec" onclick="this.closest('.modal-bg').remove()">Cancelar</button>
        <button class="btn-pri" id="btnGuardarCamp"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>Crear campaña</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#btnGuardarCamp').onclick = async () => {
    try {
      await campanasApi.create({
        nombre:     document.getElementById('cp-nombre').value,
        canal:      document.getElementById('cp-canal').value,
        objetivo:   document.getElementById('cp-obj').value,
        presupuesto: parseFloat(document.getElementById('cp-ppto').value) || 0,
        metaLeads:  parseInt(document.getElementById('cp-meta').value) || 0,
        fechaInicio: document.getElementById('cp-inicio').value,
        descripcion: document.getElementById('cp-desc').value,
      });
      toast('Campaña creada', 'ok');
      modal.remove();
      renderCampanas(el);
    } catch(err) { toast('Error: '+err.message,'err'); }
  };
  modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
}
