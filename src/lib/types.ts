export interface Profile {
  id: string
  nombre: string
  apellidos: string
  cargo: string | null
  rol: 'admin' | 'gerente' | 'ingeniero' | 'maestro' | 'contador' | 'trabajador'
  activo: boolean
  created_at: string
}

export interface Proyecto {
  id: string
  nombre: string
  descripcion: string | null
  tipo: string
  estado: 'planificacion' | 'en_progreso' | 'pausado' | 'completado' | 'cancelado'
  presupuesto_total: number
  fecha_inicio: string | null
  fecha_fin_estimada: string | null
  created_at: string
}

export interface ProyectoPersonal {
  id: string
  proyecto_id: string
  perfil_id: string
  rol_proyecto: string
  fecha_asignacion: string
}

export interface Tarea {
  id: string
  proyecto_id: string
  asignado_a: string | null
  titulo: string
  descripcion: string | null
  estado: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada'
  prioridad: 'baja' | 'media' | 'alta' | 'urgente'
  fecha_vencimiento: string | null
  created_at: string
}

export interface Material {
  id: string
  nombre: string
  descripcion: string | null
  unidad: string
  stock_actual: number
  stock_minimo: number
  precio_unitario: number
  proveedor: string | null
  created_at: string
}

export interface MovimientoInventario {
  id: string
  material_id: string
  tipo: 'entrada' | 'salida'
  cantidad: number
  proyecto_id: string | null
  descripcion: string | null
  fecha: string
  registrado_por: string | null
}

export interface Transaccion {
  id: string
  tipo: 'ingreso' | 'egreso'
  categoria: string
  descripcion: string
  monto: number
  fecha: string
  proyecto_id: string | null
  registrado_por: string | null
  created_at: string
}

export interface Documento {
  id: string
  nombre: string
  tipo: string
  proyecto_id: string | null
  url_archivo: string
  subido_por: string | null
  created_at: string
}
