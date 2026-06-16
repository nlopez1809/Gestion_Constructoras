export function toast(msg,type='ok',dur=3500){
  const c={ok:{bg:'var(--leaf-pale)',color:'var(--leaf)'},err:{bg:'var(--red-bg)',color:'var(--red)'},warn:{bg:'var(--warn-bg)',color:'var(--gold)'},info:{bg:'var(--blue-bg)',color:'var(--blue)'}};
  const ct=c[type]||c.ok;
  const el=document.createElement('div');
  el.style.cssText=`position:fixed;bottom:24px;right:24px;z-index:9999;background:${ct.bg};color:${ct.color};border-radius:12px;padding:12px 18px;font-size:13px;font-weight:500;display:flex;align-items:center;gap:10px;box-shadow:0 8px 30px rgba(26,14,4,.12);animation:slideIn .25s ease;max-width:360px;font-family:'DM Sans',sans-serif;border:1px solid ${ct.color}33`;
  el.innerHTML=`<span>${{ok:'✓',err:'✗',warn:'⚠',info:'ℹ'}[type]||'ℹ'}</span><span>${msg}</span>`;
  if(!document.querySelector('#_ts')){const s=document.createElement('style');s.id='_ts';s.textContent='@keyframes slideIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}';document.head.appendChild(s);}
  document.body.appendChild(el);
  setTimeout(()=>{el.style.opacity='0';el.style.transition='opacity .3s';setTimeout(()=>el.remove(),300);},dur);
}
let _ldg=null;
export function showLoading(txt='Cargando...'){
  if(_ldg)return;
  _ldg=document.createElement('div');
  _ldg.style.cssText='position:fixed;inset:0;background:rgba(26,14,4,.25);z-index:8000;display:flex;align-items:center;justify-content:center;';
  _ldg.innerHTML=`<div style="background:white;border-radius:16px;padding:28px 36px;text-align:center;box-shadow:0 16px 40px rgba(26,14,4,.15)"><div style="width:40px;height:40px;border:3px solid #ede8e0;border-top-color:#2d5e1e;border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 14px"></div><div style="font-size:13px;color:#5a3a20;font-family:'DM Sans',sans-serif">${txt}</div></div>`;
  document.body.appendChild(_ldg);
}
export function hideLoading(){if(_ldg){_ldg.remove();_ldg=null;}}
export function confirm(msg,title='¿Confirmar?'){
  return new Promise(res=>{
    const m=document.createElement('div');
    m.style.cssText='position:fixed;inset:0;background:rgba(26,14,4,.35);z-index:9000;display:flex;align-items:center;justify-content:center;';
    m.innerHTML=`<div style="background:white;border-radius:16px;padding:28px;width:400px;max-width:96vw;box-shadow:0 20px 50px rgba(26,14,4,.18);font-family:'DM Sans',sans-serif"><div style="font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:#3b1f0a;margin-bottom:10px">${title}</div><div style="font-size:13px;color:#5a3a20;margin-bottom:20px;line-height:1.6">${msg}</div><div style="display:flex;gap:10px;justify-content:flex-end"><button id="_cn" style="background:#f8f6f3;border:1px solid #ede8e0;border-radius:8px;padding:0 16px;height:36px;font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif;color:#5a3a20">Cancelar</button><button id="_cy" style="background:#3b1f0a;color:white;border:none;border-radius:8px;padding:0 16px;height:36px;font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif">Confirmar</button></div></div>`;
    document.body.appendChild(m);
    m.querySelector('#_cy').onclick=()=>{m.remove();res(true);};
    m.querySelector('#_cn').onclick=()=>{m.remove();res(false);};
  });
}
export const fmt={
  usd:n=>`$${Number(n||0).toLocaleString('en-US',{maximumFractionDigits:0})}`,
  usdDec:n=>`$${Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`,
  bs:n=>`Bs ${Number(n||0).toLocaleString('es-BO',{minimumFractionDigits:2})}`,
  pct:n=>`${Number(n||0).toFixed(1)}%`,
  fecha:d=>d?new Date(d).toLocaleDateString('es-BO',{day:'2-digit',month:'2-digit',year:'numeric'}):'—',
  fechaHora:d=>d?new Date(d).toLocaleString('es-BO',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—',
  nombre:e=>e?`${e.nombre||''} ${e.apellido||''}`.trim():'—',
};
export function pill(txt,tipo='gray'){
  const s={ok:'background:#ddf0cc;color:#2d5e1e',err:'background:#fdf0ee;color:#c04030',warn:'background:#fdf6e8;color:#b8872a',blue:'background:#e8f0fe;color:#3a5cbf',gray:'background:#f8f6f3;color:#9a8272'};
  return `<span style="${s[tipo]||s.gray};display:inline-flex;align-items:center;padding:2px 9px;border-radius:20px;font-size:10px;font-weight:500">${txt}</span>`;
}
export function estadoPill(estado){
  const m={AL_DIA:['Al día','ok'],PROXIMO_VENCER:['Próximo','warn'],VENCIDO:['Vencido','err'],CANCELADO:['Cancelado','gray'],DISPONIBLE:['Disponible','ok'],RESERVADO:['Reservado','blue'],VENDIDO:['Vendido','gray'],ACTIVO:['Activo','ok'],LICENCIA:['Licencia','warn'],VACACION:['Vacación','blue'],INACTIVO:['Inactivo','gray'],PENDIENTE:['Pendiente','warn'],APROBADA:['Aprobada','ok'],PAGADA:['Pagada','ok'],EN_TRANSITO:['En tránsito','blue'],RECIBIDA:['Recibida','ok'],SOLICITADA:['Solicitada','gray'],EMITIDA:['Emitida','blue'],FIRMADO:['Firmado','ok'],PENDIENTE_FIRMA:['Pend. firma','warn'],NUEVO:['Nuevo','blue'],CONTACTADO:['Contactado','warn'],INTERESADO:['Interesado','blue'],EN_NEGOCIACION:['Negociación','warn'],CONVERTIDO:['Convertido','ok'],PERDIDO:['Perdido','err'],EN_OBRA:['En obra','ok'],EN_PLANIFICACION:['Planif.','blue'],ENTREGADO:['Entregado','gray'],COMPLETADA:['Completada','ok'],EN_CURSO:['En curso','blue'],};
  const [t,tp]=m[estado]||[estado,'gray'];
  return pill(t,tp);
}
export function renderTable(container,columns,rows,emptyMsg='Sin datos'){
  if(!rows||rows.length===0){container.innerHTML=`<div style="padding:32px;text-align:center;color:var(--text-muted);font-size:12.5px">${emptyMsg}</div>`;return;}
  let h=`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><thead><tr>`;
  columns.forEach(c=>h+=`<th style="font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);text-align:${c.align||'left'};padding:8px 14px;background:var(--off);border-bottom:1px solid var(--border)">${c.header}</th>`);
  h+=`</tr></thead><tbody>`;
  rows.forEach((row,i)=>{h+=`<tr style="background:${i%2===1?'var(--off)':'var(--white)'}">`;columns.forEach(c=>{const v=typeof c.render==='function'?c.render(row):(row[c.key]??'—');h+=`<td style="font-size:12.5px;color:var(--text-mid);padding:9px 14px;border-bottom:1px solid var(--border);text-align:${c.align||'left'};vertical-align:middle">${v}</td>`;});h+=`</tr>`;});
  h+=`</tbody></table></div>`;
  container.innerHTML=h;
}
export function renderPagination(container,total,page,limit,onPage){
  const tp=Math.ceil(total/limit);if(tp<=1){container.innerHTML='';return;}
  let h=`<div style="display:flex;align-items:center;gap:6px;padding:12px 14px;border-top:1px solid var(--border);font-size:12px;color:var(--text-muted)"><span>${(page-1)*limit+1}–${Math.min(page*limit,total)} de ${total}</span><div style="margin-left:auto;display:flex;gap:4px">`;
  for(let p=1;p<=tp;p++){const a=p===page;h+=`<button onclick="(${onPage.toString()})(${p})" style="width:32px;height:32px;border-radius:8px;border:1px solid ${a?'var(--leaf)':'var(--border)'};background:${a?'var(--leaf-pale)':'var(--white)'};color:${a?'var(--leaf)':'var(--text-muted)'};cursor:pointer;font-size:12px;font-family:'DM Sans',sans-serif">${p}</button>`;}
  h+=`</div></div>`;
  container.innerHTML=h;
}
export function debounce(fn,delay=400){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),delay);};}
