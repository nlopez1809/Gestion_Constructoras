import React, { useEffect, useState, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { supabase } from '../lib/supabase'
import { Material } from '../lib/types'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { Plus, X } from 'lucide-react'

interface MovForm {
  material_id: string
  tipo: 'entrada' | 'salida'
  cantidad: number
  descripcion: string
}

export default function Inventario() {
  const { profile, user } = useAuth()
  const [materiales, setMateriales] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<MovForm>({ material_id: '', tipo: 'entrada', cantidad: 1, descripcion: '' })
  const [saving, setSaving] = useState(false)

  const canEdit = profile?.rol === 'admin' || profile?.rol === 'gerente' || profile?.rol === 'maestro'

  async function fetchMateriales() {
    const { data, error } = await supabase.from('materiales').select('*').order('nombre')
    if (!error) setMateriales((data as Material[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchMateriales() }, [])

  function openModal() {
    setForm({ material_id: materiales[0]?.id ?? '', tipo: 'entrada', cantidad: 1, descripcion: '' })
    setOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      material_id: form.material_id,
      tipo: form.tipo,
      cantidad: form.cantidad,
      descripcion: form.descripcion || null,
      fecha: new Date().toISOString().split('T')[0],
      registrado_por: user?.id ?? null,
      proyecto_id: null,
    }
    const { error } = await supabase.from('movimientos_inventario').insert(payload)
    if (error) {
      toast.error('Error: ' + error.message)
    } else {
      toast.success('Movimiento registrado')
      setOpen(false)
      const mat = materiales.find(m => m.id === form.material_id)
      if (mat) {
        const newStock = form.tipo === 'entrada'
          ? mat.stock_actual + form.cantidad
          : mat.stock_actual - form.cantidad
        await supabase.from('materiales').update({ stock_actual: newStock }).eq('id', mat.id)
      }
      fetchMateriales()
    }
    setSaving(false)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Inventario</h1>
        {canEdit && (
          <button onClick={openModal}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Registrar Movimiento
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
                {['Material', 'Unidad', 'Stock Actual', 'Stock Mínimo', 'Precio Unitario', 'Estado'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {materiales.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No hay materiales</td></tr>
              ) : materiales.map(m => {
                const bajo = m.stock_actual < m.stock_minimo
                return (
                  <tr key={m.id} className={bajo ? 'bg-red-50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3 font-medium text-slate-800">{m.nombre}</td>
                    <td className="px-4 py-3 text-gray-600">{m.unidad}</td>
                    <td className={`px-4 py-3 font-semibold ${bajo ? 'text-red-600' : 'text-gray-800'}`}>{m.stock_actual}</td>
                    <td className="px-4 py-3 text-gray-600">{m.stock_minimo}</td>
                    <td className="px-4 py-3 text-gray-600">${m.precio_unitario.toLocaleString('es-MX')}</td>
                    <td className="px-4 py-3">
                      {bajo ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Stock Bajo</span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">OK</span>
                      )}
                    </td>
                  </tr>
                )
              })}
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
                  <Dialog.Title className="text-lg font-semibold text-slate-800">Registrar Movimiento</Dialog.Title>
                  <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>
                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Material *</label>
                    <select required value={form.material_id} onChange={e => setForm(f => ({ ...f, material_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-500">
                      {materiales.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as 'entrada' | 'salida' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-500">
                      <option value="entrada">Entrada</option>
                      <option value="salida">Salida</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad *</label>
                    <input required type="number" min={1} value={form.cantidad}
                      onChange={e => setForm(f => ({ ...f, cantidad: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                    <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-500" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setOpen(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                    <button type="submit" disabled={saving}
                      className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2">
                      {saving && <div className="border-2 border-white border-t-transparent rounded-full w-4 h-4 animate-spin" />}
                      Registrar
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
