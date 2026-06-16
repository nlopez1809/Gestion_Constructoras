import api from './client'

export const authApi = {
  login:          (email: string, password: string) => api.post('/auth/login', { email, password }),
  me:             ()                                => api.get('/auth/me'),
  register:       (d: unknown)                      => api.post('/auth/register', d),
  changePassword: (actual: string, nueva: string)   => api.put('/auth/password', { actual, nueva }),
}

export const dashboardApi = {
  kpis: () => api.get('/dashboard'),
}

export const proyectosApi = {
  list:   (p?: Record<string, string | number | boolean | undefined>) => api.get('/proyectos', p),
  get:    (id: string)           => api.get(`/proyectos/${id}`),
  create: (d: unknown)           => api.post('/proyectos', d),
  update: (id: string, d: unknown) => api.put(`/proyectos/${id}`, d),
  delete: (id: string)           => api.delete(`/proyectos/${id}`),
  costos: (id: string)           => api.get(`/proyectos/${id}/costos`),
}

export const empleadosApi = {
  list:   (p?: Record<string, string | number | boolean | undefined>) => api.get('/empleados', p),
  get:    (id: string)             => api.get(`/empleados/${id}`),
  create: (d: unknown)             => api.post('/empleados', d),
  update: (id: string, d: unknown) => api.put(`/empleados/${id}`, d),
}

export const materialesApi = {
  list:      (p?: Record<string, string | number | boolean | undefined>) => api.get('/materiales', p),
  create:    (d: unknown)             => api.post('/materiales', d),
  update:    (id: string, d: unknown) => api.put(`/materiales/${id}`, d),
  movimiento:(d: unknown)             => api.post('/ordenes/inventario/movimiento', d),
}

export const finanzasApi = {
  movimientos:     (p?: Record<string, string | number | boolean | undefined>) => api.get('/finanzas/movimientos', p),
  crear:           (d: unknown) => api.post('/finanzas/movimientos', d),
  flujo:           (p?: Record<string, string | number | boolean | undefined>) => api.get('/finanzas/flujo', p),
  estadoResultados:(p?: Record<string, string | number | boolean | undefined>) => api.get('/finanzas/estado-resultados', p),
  saldoCaja:       ()           => api.get('/finanzas/saldo-caja'),
}

export const documentosApi = {
  list:    (p?: Record<string, string | number | boolean | undefined>) => api.get('/documentos', p),
  subir:   (fd: FormData)          => api.upload('/documentos', fd),
  update:  (id: string, d: unknown)=> api.patch(`/documentos/${id}`, d),
  delete:  (id: string)            => api.delete(`/documentos/${id}`),
}

export const reportesApi = {
  historial:   () => api.get('/reportes/historial'),
  programados: () => api.get('/reportes/programados'),
}
