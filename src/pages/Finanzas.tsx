import React, { useEffect, useState, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { supabase } from '../lib/supabase'
import { Transaccion, Proyecto } from '../lib/types'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { Plus, X } from 'lucide-react'

type Filtro = 'todos' | 'ingreso' | 'egreso'

const emptyForm = {
  tipo: 'ingreso' as Transaccion['tipo'],
  categoria: '',
  descripcion: '',
  monto: 0,
  fecha: new Date().toISOString().split('T')[0],
  proyecto_id: '',
}

export default function Finanzas() {
  const { profile, user } = useAuth()
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const canEdit = profile?.rol === 'admin' || profile?.rol === 'contador'

  async function fetchData() {
    const [{ data: tData }, { data: pData }] = await Promise.all([
      supabase.from('transacciones').select('*').order('fecha', { ascending: false }),
      supabase.from('proyectos').select('id, nombre'),
    ])
    setTransacciones((tData as Transaccion[]) ?? [])
    setProyectos((pData as Proyecto[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      tipo: form.tipo,
      categoria: form.categoria,
      descripcion: form.descripcion,
      monto: form.monto,
      fecha: form.fecha,
      proyecto_id: form.proyecto_id || null,
      registrado_por: user?.id ?? null,
    }
    const { error } = await supabase.from('transacciones').insert(payload)
    if (error) {
      toast.error('Error: ' + error.message)
    } else {
      toast.success('Transacción registrada')
      setOpen(false)
      fetchData()
    }
    setSaving(false)
  }

  const filtered = filtro === 'todos' ? transacciones : transacciones.filter(t => t.tipo === filtro)
  const balance = transacciones.reduce((acc, t) => acc + (t.tipo === 'ingreso' ? t.monto : -t.monto), 0)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Finanzas</h1>
        {canEdit && (
          <button onClick={() => { setForm(emptyForm); setOpen(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Nueva Transacción
          </button>
        )}
      </div>

      {/* Balance card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6 inline-block">
        <p className="text-sm text-gray-500 mb-1">Balance Total</p>
        <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          ${balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {(['todos', 'ingreso', 'egreso'] as Filtro[]).map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              filtro === f ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}>
            {f}
          </button>
        ))}
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
                {['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No hay transacciones</td></tr>
              ) : filtered.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{t.fecha}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      t.tipo === 'ingreso' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {t.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.categoria}</td>
                  <td className="px-4 py-3 text-gray-600">{t.descripcion}</td>
                  <td className={`px-4 py-3 font-semibold ${t.tipo === 'ingreso' ? 'text-green-600' : 'text-red-500'}`}>
                    {t.tipo === 'egreso' ? '-' : ''}${t.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Transition show={open} as={Fragment}>
        <Dialog onClose={() => setOpen(false)} className="relative z-50">
          <Transition.Child as={Fragment}
            enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
            leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/40" />
          </Transition.Child>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child as={Fragment}
              enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-5">
                  <Dialog.Title className="text-lg font-semibold text-slate-800">Nueva Transacción</Dialog.Title>
                  <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                      <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as Transaccion['tipo'] }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-500">
                        <option value="ingreso">Ingreso</option>
                        <option value="egreso">Egreso</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                      <input required type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
                    <input required value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
                    <input required value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
                    <input required type="number" min={0} step="0.01" value={form.monto}
                      onChange={e => setForm(f => ({ ...f, monto: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Proyecto</label>
                    <select value={form.proyecto_id} onChange={e => setForm(f => ({ ...f, proyecto_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-500">
                      <option value="">Sin proyecto</option>
                      {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setOpen(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
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
