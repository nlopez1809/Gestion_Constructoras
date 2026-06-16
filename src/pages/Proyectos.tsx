import { useEffect, useState, type FormEvent } from 'react'
import { Plus, Search, MapPin, Calendar, DollarSign, Trash2, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import {
  ESTADO_PROYECTO_COLORS, ESTADO_PROYECTO_LABELS,
  TIPO_PROYECTO_LABELS,
} from '@/lib/constants'
import type { Proyecto, EstadoProyecto, TipoProyecto } from '@/types'

const tipoOptions = Object.entries(TIPO_PROYECTO_LABELS).map(([value, label]) => ({ value, label }))
const estadoOptions = Object.entries(ESTADO_PROYECTO_LABELS).map(([value, label]) => ({ value, label }))

const empty = {
  nombre: '', descripcion: '', tipo: 'residencial' as TipoProyecto,
  estado: 'planificacion' as EstadoProyecto, ubicacion: '',
  presupuesto_total: '', fecha_inicio: '', fecha_fin_estimada: '',
}

export function Proyectos() {
  const { user, canDo } = useAuthContext()
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filtroEstado, setFiltro] = useState<string>('todos')
  const [modal, setModal]         = useState(false)
  const [editing, setEditing]     = useState<Proyecto | null>(null)
  const [form, setForm]           = useState({ ...empty })
  const [saving, setSaving]       = useState(false)

  const canWrite = canDo('proyectos_write')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('proyectos')
      .select('*, responsable:profiles(nombres,apellidos)')
      .order('created_at', { ascending: false })
    setProyectos((data ?? []) as Proyecto[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openNew = () => { setEditing(null); setForm({ ...empty }); setModal(true) }
  const openEdit = (p: Proyecto) => {
    setEditing(p)
    setForm({
      nombre: p.nombre, descripcion: p.descripcion ?? '', tipo: p.tipo,
      estado: p.estado, ubicacion: p.ubicacion ?? '',
      presupuesto_total: String(p.presupuesto_total),
      fecha_inicio: p.fecha_inicio ?? '', fecha_fin_estimada: p.fecha_fin_estimada ?? '',
    })
    setModal(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.nombre) return toast.error('El nombre es requerido')
    setSaving(true)
    const payload = {
      nombre: form.nombre, descripcion: form.descripcion || null, tipo: form.tipo,
      estado: form.estado, ubicacion: form.ubicacion || null,
      presupuesto_total: parseFloat(form.presupuesto_total) || 0,
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin_estimada: form.fecha_fin_estimada || null,
      updated_at: new Date().toISOString(),
    }
    if (editing) {
      const { error } = await supabase.from('proyectos').update(payload).eq('id', editing.id)
      if (error) toast.error('Error al actualizar')
      else { toast.success('Proyecto actualizado'); setModal(false); load() }
    } else {
      const { error } = await supabase.from('proyectos').insert({ ...payload, created_by: user!.id })
      if (error) toast.error('Error al crear proyecto')
      else { toast.success('Proyecto creado'); setModal(false); load() }
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este proyecto?')) return
    const { error } = await supabase.from('proyectos').delete().eq('id', id)
    if (error) toast.error('Error al eliminar')
    else { toast.success('Proyecto eliminado'); load() }
  }

  const fmt = (n: number) => new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', maximumFractionDigits: 0 }).format(n)

  const filtered = proyectos.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) ||
                        (p.ubicacion ?? '').toLowerCase().includes(search.toLowerCase())
    const matchEstado = filtroEstado === 'todos' || p.estado === filtroEstado
    return matchSearch && matchEstado
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proyectos</h1>
          <p className="text-sm text-gray-500 mt-1">{proyectos.length} proyectos registrados</p>
        </div>
        {canWrite && <Button onClick={openNew}><Plus size={16}/>Nuevo Proyecto</Button>}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar proyectos..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-verde-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['todos', 'planificacion', 'en_proceso', 'pausado', 'terminado'].map(e => (
            <button key={e} onClick={() => setFiltro(e)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtroEstado === e ? 'bg-verde-700 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {e === 'todos' ? 'Todos' : ESTADO_PROYECTO_LABELS[e as EstadoProyecto]}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({length:6}).map((_,i) => <div key={i} className="bg-white rounded-xl h-52 animate-pulse border border-gray-100"/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No se encontraron proyectos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-verde-600 uppercase tracking-wide mb-1">
                      {TIPO_PROYECTO_LABELS[p.tipo]}
                    </p>
                    <h3 className="font-semibold text-gray-900 truncate">{p.nombre}</h3>
                  </div>
                  <Badge className={`ml-2 flex-shrink-0 ${ESTADO_PROYECTO_COLORS[p.estado]}`}>
                    {ESTADO_PROYECTO_LABELS[p.estado]}
                  </Badge>
                </div>

                {p.descripcion && <p className="text-sm text-gray-500 line-clamp-2 mb-3">{p.descripcion}</p>}

                <div className="space-y-1.5">
                  {p.ubicacion && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin size={12}/>{p.ubicacion}
                    </div>
                  )}
                  {p.fecha_inicio && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Calendar size={12}/>Inicio: {p.fecha_inicio}
                      {p.fecha_fin_estimada && ` → ${p.fecha_fin_estimada}`}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                    <DollarSign size={12}/>{fmt(p.presupuesto_total)}
                  </div>
                </div>

                {/* Budget bar */}
                {p.presupuesto_total > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Gastado</span>
                      <span>{Math.round((p.presupuesto_gastado / p.presupuesto_total) * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${p.presupuesto_gastado / p.presupuesto_total > 0.9 ? 'bg-red-500' : 'bg-verde-500'}`}
                        style={{ width: `${Math.min(100, (p.presupuesto_gastado / p.presupuesto_total) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {canWrite && (
                <div className="px-5 py-3 border-t border-gray-50 flex gap-2">
                  <button onClick={() => openEdit(p)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-verde-700 transition-colors">
                    <Pencil size={13}/>Editar
                  </button>
                  <button onClick={() => handleDelete(p.id)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors ml-auto">
                    <Trash2 size={13}/>Eliminar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar Proyecto' : 'Nuevo Proyecto'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre del Proyecto" value={form.nombre} onChange={e => setForm(f => ({...f, nombre: e.target.value}))} placeholder="Ej. Torres Roble Verde" required/>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Tipo" value={form.tipo} onChange={e => setForm(f => ({...f, tipo: e.target.value as TipoProyecto}))} options={tipoOptions}/>
            <Select label="Estado" value={form.estado} onChange={e => setForm(f => ({...f, estado: e.target.value as EstadoProyecto}))} options={estadoOptions}/>
          </div>
          <Input label="Ubicación" value={form.ubicacion} onChange={e => setForm(f => ({...f, ubicacion: e.target.value}))} placeholder="Ej. Sopocachi, La Paz"/>
          <Input label="Presupuesto Total (BOB)" type="number" value={form.presupuesto_total} onChange={e => setForm(f => ({...f, presupuesto_total: e.target.value}))} placeholder="0"/>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Fecha de Inicio" type="date" value={form.fecha_inicio} onChange={e => setForm(f => ({...f, fecha_inicio: e.target.value}))}/>
            <Input label="Fecha Fin Estimada" type="date" value={form.fecha_fin_estimada} onChange={e => setForm(f => ({...f, fecha_fin_estimada: e.target.value}))}/>
          </div>
          <Textarea label="Descripción" value={form.descripcion} onChange={e => setForm(f => ({...f, descripcion: e.target.value}))} placeholder="Descripción del proyecto..."/>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>{editing ? 'Actualizar' : 'Crear Proyecto'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
