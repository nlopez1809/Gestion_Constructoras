const API_BASE = window.VITE_API_URL ? window.VITE_API_URL + '/api' : 'http://localhost:3000/api';
const TokenStore = {
  get access()  { return localStorage.getItem('robles_access'); },
  get refresh() { return localStorage.getItem('robles_refresh'); },
  set(a,r){ localStorage.setItem('robles_access',a); if(r) localStorage.setItem('robles_refresh',r); },
  clear(){ ['robles_access','robles_refresh','robles_user'].forEach(k=>localStorage.removeItem(k)); }
};
let refreshing=false, queue=[];
async function refreshToken() {
  const rt=TokenStore.refresh; if(!rt) throw new Error('No token');
  const r=await fetch(`${API_BASE}/auth/refresh`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshToken:rt})});
  if(!r.ok) throw new Error('Refresh failed');
  const d=await r.json(); TokenStore.set(d.accessToken,d.refreshToken); return d.accessToken;
}
async function apiFetch(path,opts={}){
  const url=`${API_BASE}${path}`;
  const hdrs={'Content-Type':'application/json','ngrok-skip-browser-warning':'1',...opts.headers};
  if(TokenStore.access) hdrs['Authorization']=`Bearer ${TokenStore.access}`;
  let r=await fetch(url,{...opts,headers:hdrs});
  if(r.status===401 && TokenStore.refresh){
    try{ const t=await refreshToken(); hdrs['Authorization']=`Bearer ${t}`; r=await fetch(url,{...opts,headers:hdrs}); }
    catch{ TokenStore.clear(); window.location.href='./robles_login.html'; throw new Error('Sesión expirada'); }
  }
  if(!r.ok){ const e=await r.json().catch(()=>({error:`HTTP ${r.status}`})); throw new Error(e.error||`Error ${r.status}`); }
  if(r.status===204) return null;
  return r.json();
}
const api={
  get:(p,q)=>apiFetch(p+(q?'?'+new URLSearchParams(q):''),{method:'GET'}),
  post:(p,b)=>apiFetch(p,{method:'POST',body:JSON.stringify(b)}),
  put:(p,b)=>apiFetch(p,{method:'PUT',body:JSON.stringify(b)}),
  patch:(p,b)=>apiFetch(p,{method:'PATCH',body:JSON.stringify(b)}),
  delete:(p)=>apiFetch(p,{method:'DELETE'}),
  upload:(p,fd)=>{const h={};if(TokenStore.access)h['Authorization']=`Bearer ${TokenStore.access}`;return apiFetch(p,{method:'POST',body:fd,headers:h});},
  download:async(p,fn)=>{const h={'Content-Type':'application/json','ngrok-skip-browser-warning':'1'};if(TokenStore.access)h['Authorization']=`Bearer ${TokenStore.access}`;const r=await fetch(`${API_BASE}${p}`,{method:'GET',headers:h});if(!r.ok)throw new Error('Error al descargar');const b=await r.blob(),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=fn;a.click();URL.revokeObjectURL(u);}
};
export {api,TokenStore,API_BASE};
export default api;
