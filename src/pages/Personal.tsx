import { useEffect, useState } from 'react'
import { Search, UserCheck, UserX, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/store/authStore'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Input'
import { ROL_LABELS, ROL_COLORS } from '@/lib/constants'
import type { Profile, Rol } from '@/types'

const rolOptions = Object.entries(ROL_LABELS).map(([value, label]) => ({ value, label }))

export function Personal() {
  const { user, hasRole } = useAuthContext()
  const [personal, setPersonal] = useState<Profile[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [editUser, setEditUser] = useState<Profile | null>(null)
  const [newRol, setNewRol]     = useState<Rol>('viewer')
  const [saving, setSaving]     = useState(false)

  const isAdmin = hasRole('admin')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setPersonal((data ?? []) as Profile[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openEdit = (p: Profile) => { setEditUser(p); setNewRol(p.rol) }

  const handleUpdateRol = async () => {
    if (!editUser) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ rol: newRol }).eq('id', editUser.id)
    if (error) toast.error('Error al actualizar rol')
    else { toast.success('Rol actualizado'); setEditUser(null); load() }
    setSaving(false)
  }

  const toggleActivo = async (p: Profile) => {
    const { error } = await supabase.from('profiles').update({ activo: !p.activo }).eq('id', p.id)
    if (error) toast.error('Error al actualizar')
    else { toast.success(p.activo ? 'Usuario desactivado' : 'Usuario activado'); load() }
  }

  const filtered = personal.filter(p =>
    `${p.nombres} ${p.apellidos} ${p.cargo}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Personal / RRHH</h1>
        <p className="text-sm text-gray-500 mt-1">{personal.filter(p=>p.activo).length} colaboradores activos</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar personal..."
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-verde-500"/>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({length:5}).map((_,i) => <div key={i} className="bg-white rounded-xl h-16 animate-pulse border border-gray-100"/>)}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Colaborador</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cargo</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rol en Sistema</th>
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
                        {p.nombres[0]}{p.apellidos[0]}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900">{p.nombres} {p.apellidos}</p>
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
                          <ShieldCheck size={13}/>Rol
                        </button>
                        {p.id !== user?.id && (
                          <button onClick={() => toggleActivo(p)}
                            className={`flex items-center gap-1 text-xs transition-colors px-2 py-1 rounded-md ${
                              p.activo ? 'text-gray-500 hover:text-red-600 hover:bg-red-50' : 'text-gray-500 hover:text-verde-600 hover:bg-verde-50'
                            }`}>
                            {p.activo ? <><UserX size={13}/>Desactivar</> : <><UserCheck size={13}/>Activar</>}
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">Sin resultados</p>
          )}
        </div>
      )}

      {/* Modal cambio de rol */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Cambiar Rol de Usuario" size="sm">
        {editUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-verde-600 flex items-center justify-center text-white font-bold text-sm">
                {editUser.nombres[0]}{editUser.apellidos[0]}
              </div>
              <div>
                <p className="font-medium text-sm">{editUser.nombres} {editUser.apellidos}</p>
                <p className="text-xs text-gray-500">{editUser.cargo}</p>
              </div>
            </div>
            <Select
              label="Nuevo Rol"
              value={newRol}
              onChange={e => setNewRol(e.target.value as Rol)}
              options={rolOptions}
            />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setEditUser(null)}>Cancelar</Button>
              <Button loading={saving} onClick={handleUpdateRol}>Guardar Cambio</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
