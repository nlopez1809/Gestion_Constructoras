import React, { useEffect, useState, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { supabase } from '../lib/supabase'
import { Proyecto } from '../lib/types'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { Plus, X } from 'lucide-react'

const estadoBadge: Record<string, string> = {
  planificacion: 'bg-blue-100 text-blue-800',
  en_progreso: 'bg-green-100 text-green-800',
  pausado: 'bg-yellow-100 text-yellow-800',
  completado: 'bg-gray-100 text-gray-800',
  cancelado: 'bg-red-100 text-red-800',
}

const estadoLabel: Record<string, string> = {
  planificacion: 'Planificación',
  en_progreso: 'En Progreso',
  pausado: 'Pausado',
  completado: 'Completado',
  cancelado: 'Cancelado',
}

const emptyForm = {
  nombre: '',
  descripcion: '',
  tipo: '',
  estado: 'planificacion' as Proyecto['estado'],
  presupuesto_total: 0,
  fecha_inicio: '',
  fecha_fin_estimada: '',
}

export default function Proyectos() {
  const { profile } = useAuth()
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const canEdit = profile?.rol === 'admin' || profile?.rol === 'gerente'

  async function fetchProyectos() {
    const { data, error } = await supabase.from('proyectos').select('*').order('created_at', { ascending: false })
    if (!error) setProyectos((data as Proyecto[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchProyectos() }, [])

  function openModal() {
    setForm(emptyForm)
    setOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      nombre: form.nombre,
      descripcion: form.descripcion || null,
      tipo: form.tipo,
      estado: form.estado,
      presupuesto_total: form.presupuesto_total,
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin_estimada: form.fecha_fin_estimada || null,
    }
    const { error } = await supabase.from('proyectos').insert(payload)
    if (error) {
      toast.error('Error al guardar: ' + error.message)
    } else {
      toast.success('Proyecto creado')
      setOpen(false)
      fetchProyectos()
    }
    setSaving(false)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Proyectos</h1>
        {canEdit && (
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Nuevo Proyecto
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="border-4 border-amber-500 border-t-transparent rounded-full w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Nombre', 'Tipo', 'Estado', 'Presupuesto', 'Inicio', 'Fin Estimado'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {proyectos.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No hay proyectos</td></tr>
              ) : proyectos.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{p.nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{p.tipo}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${estadoBadge[p.estado]}`}>
                      {estadoLabel[p.estado]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    ${p.presupuesto_total.toLocaleString('es-MX')}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.fecha_inicio ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{p.fecha_fin_estimada ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Transition show={open} as={Fragment}>
        <Dialog onClose={() => setOpen(false)} className="relative z-50">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
            leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40" />
          </Transition.Child>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
                <div className="flex items-center justify-between mb-5">
                  <Dialog.Title className="text-lg font-semibold text-slate-800">Nuevo Proyecto</Dialog.Title>
                  <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                    <input required value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                    <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                      rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-500 resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                      <input required value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                      <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value as Proyecto['estado'] }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-500">
                        <option value="planificacion">Planificación</option>
                        <option value="en_progreso">En Progreso</option>
                        <option value="pausado">Pausado</option>
                        <option value="completado">Completado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Presupuesto Total *</label>
                    <input required type="number" min={0} value={form.presupuesto_total}
                      onChange={e => setForm(f => ({ ...f, presupuesto_total: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
                      <input type="date" value={form.fecha_inicio} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fin Estimado</label>
                      <input type="date" value={form.fecha_fin_estimada} onChange={e => setForm(f => ({ ...f, fecha_fin_estimada: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-500" />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setOpen(false)}
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
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  )
}
