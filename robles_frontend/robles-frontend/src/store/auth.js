import { api, TokenStore } from '../api/client.js';
const AuthStore = {
  _user: null,
  get user(){ if(!this._user){const r=localStorage.getItem('robles_user');if(r)this._user=JSON.parse(r);}return this._user; },
  get isAuthenticated(){ return !!TokenStore.access && !!this.user; },
  get rol(){ return this.user?.rol||null; },
  hasRole(...roles){ return roles.includes(this.rol); },
  async login(email,password){ const d=await api.post('/auth/login',{email,password}); TokenStore.set(d.accessToken,d.refreshToken); this._user=d.usuario; localStorage.setItem('robles_user',JSON.stringify(d.usuario)); return d.usuario; },
  logout(){ TokenStore.clear(); this._user=null; window.location.href='./robles_login.html'; }
};
export default AuthStore;
