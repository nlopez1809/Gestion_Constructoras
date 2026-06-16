import React, { useEffect, useState, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { supabase } from '../lib/supabase'
import { Profile } from '../lib/types'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { X } from 'lucide-react'

const rolBadge: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800',
  gerente: 'bg-blue-100 text-blue-800',
  ingeniero: 'bg-indigo-100 text-indigo-800',
  maestro: 'bg-orange-100 text-orange-800',
  contador: 'bg-teal-100 text-teal-800',
  trabajador: 'bg-gray-100 text-gray-800',
}

export default function Personal() {
  const { profile: myProfile } = useAuth()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Profile | null>(null)
  const [newRol, setNewRol] = useState<Profile['rol']>('trabajador')
  const [saving, setSaving] = useState(false)

  const isAdmin = myProfile?.rol === 'admin'

  async function fetchProfiles() {
    const { data, error } = await supabase.from('profiles').select('*').order('nombre')
    if (!error) setProfiles((data as Profile[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchProfiles() }, [])

  function openEdit(p: Profile) {
    setSelected(p)
    setNewRol(p.rol)
  }

  async function handleSaveRol(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ rol: newRol }).eq('id', selected.id)
    if (error) {
      toast.error('Error al actualizar: ' + error.message)
    } else {
      toast.success('Rol actualizado')
      setSelected(null)
      fetchProfiles()
    }
    setSaving(false)
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Personal</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="border-4 border-amber-500 border-t-transparent rounded-full w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Nombre', 'Apellidos', 'Cargo', 'Rol', 'Estado', isAdmin ? 'Acciones' : ''].filter(Boolean).map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {profiles.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No hay personal</td></tr>
              ) : profiles.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{p.nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{p.apellidos}</td>
                  <td className="px-4 py-3 text-gray-600">{p.cargo ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${rolBadge[p.rol]}`}>
                      {p.rol}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(p)}
                        className="text-xs text-amber-600 hover:text-amber-700 font-medium">
                        Editar rol
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Transition show={!!selected} as={Fragment}>
        <Dialog onClose={() => setSelected(null)} className="relative z-50">
          <Transition.Child as={Fragment}
            enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
            leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/40" />
          </Transition.Child>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child as={Fragment}
              enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <Dialog.Title className="text-lg font-semibold text-slate-800">Cambiar Rol</Dialog.Title>
                  <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>
                {selected && (
                  <form onSubmit={handleSaveRol} className="space-y-4">
                    <p className="text-sm text-gray-600">{selected.nombre} {selected.apellidos}</p>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nuevo Rol</label>
                      <select value={newRol} onChange={e => setNewRol(e.target.value as Profile['rol'])}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-500">
                        {['admin', 'gerente', 'ingeniero', 'maestro', 'contador', 'trabajador'].map(r => (
                          <option key={r} value={r} className="capitalize">{r}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={() => setSelected(null)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
                        Cancelar
                      </button>
                      <button type="submit" disabled={saving}
                        className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving && <div className="border-2 border-white border-t-transparent rounded-full w-4 h-4 animate-spin" />}
                        Guardar
                      </button>
                    </div>
                  </form>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  )
}
