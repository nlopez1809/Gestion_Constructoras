import type { Rol, EstadoProyecto, TipoProyecto, EstadoTarea, PrioridadTarea, TipoDocumento } from '@/types'

export const ROL_LABELS: Record<Rol, string> = {
  admin:     'Administrador',
  gerente:   'Gerente de Proyecto',
  ingeniero: 'Ingeniero / Arquitecto',
  maestro:   'Maestro de Obra',
  contador:  'Contador / Finanzas',
  ventas:    'Asesor de Ventas',
  viewer:    'Solo Lectura',
}

export const ROL_COLORS: Record<Rol, string> = {
  admin:     'bg-purple-100 text-purple-800',
  gerente:   'bg-verde-100 text-verde-800',
  ingeniero: 'bg-blue-100 text-blue-800',
  maestro:   'bg-orange-100 text-orange-800',
  contador:  'bg-yellow-100 text-yellow-800',
  ventas:    'bg-pink-100 text-pink-800',
  viewer:    'bg-gray-100 text-gray-700',
}

export const CARGO_OPTIONS = [
  'Gerente General',
  'Director de Proyectos',
  'Ingeniero Civil',
  'Ingeniero en Construcción',
  'Arquitecto',
  'Maestro de Obra',
  'Residente de Obra',
  'Supervisor de Calidad',
  'Administrador',
  'Contador / Finanzas',
  'Recursos Humanos',
  'Asesor de Ventas',
  'Técnico',
  'Otro',
]

export const ESTADO_PROYECTO_LABELS: Record<EstadoProyecto, string> = {
  planificacion: 'Planificación',
  en_proceso:    'En Proceso',
  pausado:       'Pausado',
  terminado:     'Terminado',
}

export const ESTADO_PROYECTO_COLORS: Record<EstadoProyecto, string> = {
  planificacion: 'bg-blue-100 text-blue-800',
  en_proceso:    'bg-verde-100 text-verde-800',
  pausado:       'bg-yellow-100 text-yellow-800',
  terminado:     'bg-gray-100 text-gray-700',
}

export const TIPO_PROYECTO_LABELS: Record<TipoProyecto, string> = {
  residencial:  'Residencial',
  comercial:    'Comercial',
  industrial:   'Industrial',
  educativo:    'Educativo',
  hospitalidad: 'Hospitalidad',
  mixto:        'Mixto',
}

export const ESTADO_TAREA_LABELS: Record<EstadoTarea, string> = {
  pendiente:   'Pendiente',
  en_progreso: 'En Progreso',
  completada:  'Completada',
  cancelada:   'Cancelada',
}

export const ESTADO_TAREA_COLORS: Record<EstadoTarea, string> = {
  pendiente:   'bg-gray-100 text-gray-700',
  en_progreso: 'bg-blue-100 text-blue-800',
  completada:  'bg-verde-100 text-verde-800',
  cancelada:   'bg-red-100 text-red-800',
}

export const PRIORIDAD_LABELS: Record<PrioridadTarea, string> = {
  baja:    'Baja',
  media:   'Media',
  alta:    'Alta',
  critica: 'Crítica',
}

export const PRIORIDAD_COLORS: Record<PrioridadTarea, string> = {
  baja:    'bg-gray-100 text-gray-600',
  media:   'bg-blue-100 text-blue-700',
  alta:    'bg-orange-100 text-orange-700',
  critica: 'bg-red-100 text-red-700',
}

export const TIPO_DOC_LABELS: Record<TipoDocumento, string> = {
  plano:    'Plano',
  contrato: 'Contrato',
  permiso:  'Permiso',
  reporte:  'Reporte',
  otro:     'Otro',
}

// Permisos por módulo
export const PERMISOS: Record<string, Rol[]> = {
  proyectos_write:   ['admin', 'gerente'],
  personal_write:    ['admin'],
  finanzas_read:     ['admin', 'gerente', 'contador'],
  finanzas_write:    ['admin', 'contador'],
  inventario_write:  ['admin', 'gerente', 'maestro'],
  documentos_write:  ['admin', 'gerente', 'ingeniero'],
  reportes_read:     ['admin', 'gerente', 'contador'],
  ventas_read:       ['admin', 'gerente', 'ventas'],
}
