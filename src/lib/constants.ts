import type { Rol, EstadoProyecto, TipoDocumento } from '@/types'

export const ROL_LABELS: Record<Rol, string> = {
  ADMIN:     'Administrador',
  GERENCIA:  'Gerencia',
  FINANZAS:  'Finanzas',
  COMERCIAL: 'Comercial',
  OBRA:      'Obra',
  RRHH:      'Recursos Humanos',
  LEGAL:     'Legal',
}

export const ROL_COLORS: Record<Rol, string> = {
  ADMIN:     'bg-purple-100 text-purple-800',
  GERENCIA:  'bg-verde-100 text-verde-800',
  FINANZAS:  'bg-yellow-100 text-yellow-800',
  COMERCIAL: 'bg-pink-100 text-pink-800',
  OBRA:      'bg-orange-100 text-orange-800',
  RRHH:      'bg-blue-100 text-blue-800',
  LEGAL:     'bg-gray-100 text-gray-700',
}

export const ESTADO_PROYECTO_LABELS: Record<EstadoProyecto, string> = {
  EN_PLANIFICACION: 'Planificación',
  EN_CONSTRUCCION:  'En Construcción',
  ENTREGADO:        'Entregado',
  SUSPENDIDO:       'Suspendido',
}

export const ESTADO_PROYECTO_COLORS: Record<EstadoProyecto, string> = {
  EN_PLANIFICACION: 'bg-blue-100 text-blue-800',
  EN_CONSTRUCCION:  'bg-verde-100 text-verde-800',
  ENTREGADO:        'bg-gray-100 text-gray-700',
  SUSPENDIDO:       'bg-yellow-100 text-yellow-800',
}

export const TIPO_DOC_LABELS: Record<TipoDocumento, string> = {
  PLANO:    'Plano',
  CONTRATO: 'Contrato',
  PERMISO:  'Permiso',
  REPORTE:  'Reporte',
  OTRO:     'Otro',
}

export const CARGO_OPTIONS = [
  'Gerente General',
  'Director de Proyectos',
  'Ingeniero Civil',
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

// Permisos por módulo → roles que tienen acceso
export const PERMISOS: Record<string, Rol[]> = {
  proyectos_write:  ['ADMIN', 'GERENCIA'],
  personal_write:   ['ADMIN'],
  finanzas_read:    ['ADMIN', 'GERENCIA', 'FINANZAS'],
  finanzas_write:   ['ADMIN', 'FINANZAS'],
  inventario_write: ['ADMIN', 'GERENCIA', 'OBRA'],
  documentos_write: ['ADMIN', 'GERENCIA', 'OBRA'],
  reportes_read:    ['ADMIN', 'GERENCIA', 'FINANZAS'],
}
