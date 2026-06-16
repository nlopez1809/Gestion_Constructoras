// ─── Auth & Users ───────────────────────────────────────────────────────────

export type Rol = 'ADMIN' | 'GERENCIA' | 'FINANZAS' | 'COMERCIAL' | 'OBRA' | 'RRHH' | 'LEGAL'

export interface AuthUser {
  id: string
  nombre: string
  email: string
  rol: Rol
  activo: boolean
}

// ─── Proyectos ───────────────────────────────────────────────────────────────

export type EstadoProyecto =
  | 'EN_PLANIFICACION'
  | 'EN_CONSTRUCCION'
  | 'ENTREGADO'
  | 'SUSPENDIDO'

export type TipoProyecto =
  | 'residencial'
  | 'comercial'
  | 'industrial'
  | 'educativo'
  | 'hospitalidad'
  | 'mixto'

export interface Proyecto {
  id: string
  codigo: string
  nombre: string
  descripcion: string | null
  ubicacion: string
  ciudad: string
  totalUnidades: number
  presupuesto: number
  fechaInicio: string
  fechaEntrega: string
  estado: EstadoProyecto
  avancePct: number
  createdAt: string
  updatedAt: string
}

// ─── Empleados ────────────────────────────────────────────────────────────────

export interface Empleado {
  id: string
  nombre: string
  apellido: string
  ci: string
  cargo: string
  rol: Rol
  salarioBase: number
  activo: boolean
  createdAt: string
}

// ─── Inventario ──────────────────────────────────────────────────────────────

export interface Material {
  id: string
  nombre: string
  unidad: string
  stockActual: number
  stockMinimo: number
  precioUnitario: number
  proveedor: string | null
  createdAt: string
  updatedAt: string
}

export type TipoMovimiento = 'ENTRADA' | 'SALIDA'

export interface MovimientoInventario {
  id: string
  materialId: string
  proyectoId: string | null
  tipo: TipoMovimiento
  cantidad: number
  motivo: string | null
  creadoPor: string | null
  createdAt: string
  material?: Material
}

// ─── Finanzas ────────────────────────────────────────────────────────────────

export type TipoMovimientoFin = 'INGRESO' | 'EGRESO'

export interface MovimientoFinanciero {
  id: string
  proyectoId: string | null
  tipo: TipoMovimientoFin
  categoria: string | null
  descripcion: string
  monto: number
  fecha: string
  comprobanteUrl: string | null
  creadoPor: string | null
  createdAt: string
}

// ─── Documentos ──────────────────────────────────────────────────────────────

export type TipoDocumento = 'PLANO' | 'CONTRATO' | 'PERMISO' | 'REPORTE' | 'OTRO'

export interface Documento {
  id: string
  proyectoId: string | null
  nombre: string
  tipo: TipoDocumento | null
  url: string
  tamañoKb: number | null
  subidoPor: string | null
  createdAt: string
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string
  label: string
}
