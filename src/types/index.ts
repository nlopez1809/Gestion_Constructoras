// ─── Auth & Users ───────────────────────────────────────────────────────────

export type Rol =
  | 'admin'
  | 'gerente'
  | 'ingeniero'
  | 'maestro'
  | 'contador'
  | 'ventas'
  | 'viewer'

export interface Profile {
  id: string
  nombres: string
  apellidos: string
  cargo: string
  rol: Rol
  activo: boolean
  avatar_url: string | null
  created_at: string
}

export interface AuthUser {
  id: string
  email: string
  profile: Profile
}

// ─── Proyectos ───────────────────────────────────────────────────────────────

export type EstadoProyecto =
  | 'planificacion'
  | 'en_proceso'
  | 'pausado'
  | 'terminado'

export type TipoProyecto =
  | 'residencial'
  | 'comercial'
  | 'industrial'
  | 'educativo'
  | 'hospitalidad'
  | 'mixto'

export interface Proyecto {
  id: string
  nombre: string
  descripcion: string | null
  tipo: TipoProyecto
  estado: EstadoProyecto
  ubicacion: string | null
  presupuesto_total: number
  presupuesto_gastado: number
  fecha_inicio: string | null
  fecha_fin_estimada: string | null
  fecha_fin_real: string | null
  responsable_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // joined
  responsable?: Profile
}

// ─── Tareas ──────────────────────────────────────────────────────────────────

export type EstadoTarea = 'pendiente' | 'en_progreso' | 'completada' | 'cancelada'
export type PrioridadTarea = 'baja' | 'media' | 'alta' | 'critica'

export interface Tarea {
  id: string
  proyecto_id: string
  titulo: string
  descripcion: string | null
  estado: EstadoTarea
  prioridad: PrioridadTarea
  asignado_a: string | null
  fecha_vencimiento: string | null
  completada_at: string | null
  created_by: string | null
  created_at: string
  // joined
  asignado?: Profile
  proyecto?: Proyecto
}

// ─── Personal ────────────────────────────────────────────────────────────────

export interface ProyectoPersonal {
  id: string
  proyecto_id: string
  perfil_id: string
  rol_en_proyecto: string | null
  fecha_ingreso: string
  perfil?: Profile
  proyecto?: Proyecto
}

// ─── Inventario ──────────────────────────────────────────────────────────────

export interface Material {
  id: string
  nombre: string
  unidad: string
  stock_actual: number
  stock_minimo: number
  precio_unitario: number
  proveedor: string | null
  created_at: string
  updated_at: string
}

export type TipoMovimiento = 'entrada' | 'salida'

export interface MovimientoInventario {
  id: string
  material_id: string
  proyecto_id: string | null
  tipo: TipoMovimiento
  cantidad: number
  motivo: string | null
  realizado_por: string | null
  created_at: string
  material?: Material
  proyecto?: Proyecto
  realizado?: Profile
}

// ─── Finanzas ────────────────────────────────────────────────────────────────

export type TipoTransaccion = 'ingreso' | 'egreso'

export interface Transaccion {
  id: string
  proyecto_id: string | null
  tipo: TipoTransaccion
  categoria: string | null
  descripcion: string
  monto: number
  fecha: string
  comprobante_url: string | null
  registrado_por: string | null
  created_at: string
  proyecto?: Proyecto
  registrado?: Profile
}

// ─── Documentos ──────────────────────────────────────────────────────────────

export type TipoDocumento = 'plano' | 'contrato' | 'permiso' | 'reporte' | 'otro'

export interface Documento {
  id: string
  proyecto_id: string | null
  nombre: string
  tipo: TipoDocumento | null
  url: string
  tamaño_kb: number | null
  subido_por: string | null
  created_at: string
  proyecto?: Proyecto
  subido?: Profile
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string
  label: string
}
