import { useEffect, useState, type FormEvent } from 'react'
import { Search, UserCheck, UserX, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { empleadosApi } from '@/lib/api'
import { useAuthContext } from '@/store/authStore'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { ROL_LABELS, ROL_COLORS, CARGO_OPTIONS } from '@/lib/constants'
import type { Empleado, Rol } from '@/types'

const rolOptions = Object.entries(ROL_LABELS).map(([value, label]) => ({ value, label }))
const cargoOptions = CARGO_OPTIONS.map(c => ({ value: c, label: c }))

const emptyForm = { nombre: '', apellido: '', ci: '', cargo: CARGO_OPTIONS[0], rol: 'OBRA' as Rol, salarioBase: '' }

export function Personal() {
  const { user, hasRole }   = useAuthContext()
  const [personal, setPersonal] = useState<Empleado[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState<Empleado | null>(null)
  const [form, setForm]         = useState({ ...emptyForm })
  const [saving, setSaving]     = useState(false)

  const isAdmin = hasRole('ADMIN')

  const load = () => {
    setLoading(true)
    empleadosApi.list()
      .then(res => setPersonal(((res as { data?: Empleado[] }).data ?? res) as Empleado[]))
      .catch(() => toast.error('Error al cargar personal'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openNew = () => { setEditing(null); setForm({ ...emptyForm }); setModal(true) }
  const openEdit = (e: Empleado) => {
    setEditing(e)
    setForm({ nombre: e.nombre, apellido: e.apellido, ci: e.ci, cargo: e.cargo, rol: e.rol, salarioBase: String(e.salarioBase) })
    setModal(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, salarioBase: parseFloat(form.salarioBase) || 0 }
    try {
      if (editing) {
        await empleadosApi.update(editing.id, payload)
        toast.success('Empleado actualizado')
      } else {
        await empleadosApi.create(payload)
        toast.success('Empleado creado')
      }
      setModal(false); load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const toggleActivo = async (emp: Empleado) => {
    try {
      await empleadosApi.update(emp.id, { activo: !emp.activo })
      toast.success(emp.activo ? 'Empleado desactivado' : 'Empleado activado')
      load()
    } catch {
      toast.error('Error al actualizar')
    }
  }

  const filtered = personal.filter(p =>
    `${p.nombre} ${p.apellido} ${p.cargo}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Personal / RRHH</h1>
          <p className="text-sm text-gray-500 mt-1">{personal.filter(p => p.activo).length} colaboradores activos</p>
        </div>
        {isAdmin && <Button onClick={openNew}><Plus size={16} />Nuevo Empleado</Button>}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar personal..."
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-verde-500" />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="bg-white rounded-xl h-16 animate-pulse border border-gray-100" />)}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Colaborador</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cargo</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rol</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                {isAdmin && <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold ${p.activo ? 'bg-verde-600' : 'bg-gray-300'}`}>
                        {p.nombre[0]}{p.apellido[0]}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900">{p.nombre} {p.apellido}</p>
                        {p.id === user?.id && <p className="text-xs text-verde-600">Tú</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{p.cargo}</td>
                  <td className="px-6 py-4">
                    <Badge className={ROL_COLORS[p.rol]}>{ROL_LABELS[p.rol]}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={p.activo ? 'bg-verde-100 text-verde-800' : 'bg-gray-100 text-gray-500'}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(p)}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-verde-700 transition-colors px-2 py-1 rounded-md hover:bg-verde-50">
                          Editar
                        </button>
                        {p.id !== user?.id && (
                          <button onClick={() => toggleActivo(p)}
                            className={`flex items-center gap-1 text-xs transition-colors px-2 py-1 rounded-md ${
                              p.activo ? 'text-gray-500 hover:text-red-600 hover:bg-red-50' : 'text-gray-500 hover:text-verde-600 hover:bg-verde-50'
                            }`}>
                            {p.activo ? <><UserX size={13} />Desactivar</> : <><UserCheck size={13} />Activar</>}
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">Sin resultados</p>}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar Empleado' : 'Nuevo Empleado'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nombre" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
            <Input label="Apellido" value={form.apellido} onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))} required />
          </div>
          <Input label="C.I." value={form.ci} onChange={e => setForm(f => ({ ...f, ci: e.target.value }))} required />
          <Select label="Cargo" value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} options={cargoOptions} />
          <Select label="Rol en Sistema" value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value as Rol }))} options={rolOptions} />
          <Input label="Salario Base (BOB)" type="number" value={form.salarioBase} onChange={e => setForm(f => ({ ...f, salarioBase: e.target.value }))} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>{editing ? 'Actualizar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
