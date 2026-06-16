import { useEffect, useState, type FormEvent } from 'react'
import { Plus, Search, MapPin, Calendar, DollarSign, Trash2, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { proyectosApi } from '@/lib/api'
import { useAuthContext } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { ESTADO_PROYECTO_COLORS, ESTADO_PROYECTO_LABELS } from '@/lib/constants'
import type { Proyecto, EstadoProyecto } from '@/types'

const estadoOptions = Object.entries(ESTADO_PROYECTO_LABELS).map(([value, label]) => ({ value, label }))

const empty = {
  nombre: '', descripcion: '', ubicacion: '', ciudad: 'Cochabamba',
  estado: 'EN_PLANIFICACION' as EstadoProyecto,
  presupuesto: '', totalUnidades: '', fechaInicio: '', fechaEntrega: '',
}

export function Proyectos() {
  const { canDo }         = useAuthContext()
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filtroEstado, setFiltro] = useState<string>('todos')
  const [modal, setModal]         = useState(false)
  const [editing, setEditing]     = useState<Proyecto | null>(null)
  const [form, setForm]           = useState({ ...empty })
  const [saving, setSaving]       = useState(false)

  const canWrite = canDo('proyectos_write')

  const load = () => {
    setLoading(true)
    proyectosApi.list()
      .then(res => setProyectos(((res as { data?: Proyecto[] }).data ?? res) as Proyecto[]))
      .catch(() => toast.error('Error al cargar proyectos'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openNew  = () => { setEditing(null); setForm({ ...empty }); setModal(true) }
  const openEdit = (p: Proyecto) => {
    setEditing(p)
    setForm({
      nombre: p.nombre, descripcion: p.descripcion ?? '', ubicacion: p.ubicacion,
      ciudad: p.ciudad, estado: p.estado, presupuesto: String(p.presupuesto),
      totalUnidades: String(p.totalUnidades), fechaInicio: p.fechaInicio?.slice(0, 10) ?? '',
      fechaEntrega: p.fechaEntrega?.slice(0, 10) ?? '',
    })
    setModal(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.nombre) return toast.error('El nombre es requerido')
    setSaving(true)
    const payload = {
      nombre: form.nombre, descripcion: form.descripcion || null,
      ubicacion: form.ubicacion, ciudad: form.ciudad, estado: form.estado,
      presupuesto: parseFloat(form.presupuesto) || 0,
      totalUnidades: parseInt(form.totalUnidades) || 0,
      fechaInicio: form.fechaInicio || null,
      fechaEntrega: form.fechaEntrega || null,
    }
    try {
      if (editing) {
        await proyectosApi.update(editing.id, payload)
        toast.success('Proyecto actualizado')
      } else {
        await proyectosApi.create(payload)
        toast.success('Proyecto creado')
      }
      setModal(false); load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este proyecto?')) return
    try {
      await proyectosApi.delete(id)
      toast.success('Proyecto eliminado'); load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', maximumFractionDigits: 0 }).format(n)

  const filtered = proyectos.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) ||
                        p.ubicacion.toLowerCase().includes(search.toLowerCase())
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
        {canWrite && <Button onClick={openNew}><Plus size={16} />Nuevo Proyecto</Button>}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar proyectos..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-verde-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['todos', ...Object.keys(ESTADO_PROYECTO_LABELS)].map(e => (
            <button key={e} onClick={() => setFiltro(e)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtroEstado === e ? 'bg-verde-700 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {e === 'todos' ? 'Todos' : ESTADO_PROYECTO_LABELS[e as EstadoProyecto]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-white rounded-xl h-52 animate-pulse border border-gray-100" />)}
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
                    <p className="text-xs font-semibold text-verde-600 uppercase tracking-wide mb-1">{p.codigo}</p>
                    <h3 className="font-semibold text-gray-900 truncate">{p.nombre}</h3>
                  </div>
                  <Badge className={`ml-2 flex-shrink-0 ${ESTADO_PROYECTO_COLORS[p.estado]}`}>
                    {ESTADO_PROYECTO_LABELS[p.estado]}
                  </Badge>
                </div>
                {p.descripcion && <p className="text-sm text-gray-500 line-clamp-2 mb-3">{p.descripcion}</p>}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <MapPin size={12} />{p.ubicacion}, {p.ciudad}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Calendar size={12} />Entrega: {p.fechaEntrega?.slice(0, 10)}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                    <DollarSign size={12} />{fmt(p.presupuesto)}
                  </div>
                </div>
                {p.avancePct !== undefined && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Avance</span><span>{p.avancePct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${p.avancePct > 90 ? 'bg-verde-500' : 'bg-verde-400'}`}
                        style={{ width: `${Math.min(100, p.avancePct)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              {canWrite && (
                <div className="px-5 py-3 border-t border-gray-50 flex gap-2">
                  <button onClick={() => openEdit(p)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-verde-700 transition-colors">
                    <Pencil size={13} />Editar
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors ml-auto">
                    <Trash2 size={13} />Eliminar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar Proyecto' : 'Nuevo Proyecto'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre del Proyecto" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej. Torres Roble Verde" required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Ciudad" value={form.ciudad} onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))} />
            <Select label="Estado" value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value as EstadoProyecto }))} options={estadoOptions} />
          </div>
          <Input label="Ubicación" value={form.ubicacion} onChange={e => setForm(f => ({ ...f, ubicacion: e.target.value }))} placeholder="Ej. Sopocachi, La Paz" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Presupuesto (BOB)" type="number" value={form.presupuesto} onChange={e => setForm(f => ({ ...f, presupuesto: e.target.value }))} placeholder="0" />
            <Input label="Total Unidades" type="number" value={form.totalUnidades} onChange={e => setForm(f => ({ ...f, totalUnidades: e.target.value }))} placeholder="0" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Fecha de Inicio" type="date" value={form.fechaInicio} onChange={e => setForm(f => ({ ...f, fechaInicio: e.target.value }))} />
            <Input label="Fecha de Entrega" type="date" value={form.fechaEntrega} onChange={e => setForm(f => ({ ...f, fechaEntrega: e.target.value }))} />
          </div>
          <Textarea label="Descripción" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción del proyecto..." />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>{editing ? 'Actualizar' : 'Crear Proyecto'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
