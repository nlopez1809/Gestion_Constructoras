import React, { useEffect, useState, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { supabase } from '../lib/supabase'
import { Documento, Proyecto } from '../lib/types'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { Upload, X, ExternalLink } from 'lucide-react'

interface DocForm {
  nombre: string
  tipo: string
  proyecto_id: string
  file: File | null
}

export default function Documentos() {
  const { profile, user } = useAuth()
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<DocForm>({ nombre: '', tipo: '', proyecto_id: '', file: null })
  const [saving, setSaving] = useState(false)

  const canUpload = profile?.rol === 'admin' || profile?.rol === 'gerente' || profile?.rol === 'ingeniero'

  async function fetchData() {
    const [{ data: dData }, { data: pData }] = await Promise.all([
      supabase.from('documentos').select('*').order('created_at', { ascending: false }),
      supabase.from('proyectos').select('id, nombre'),
    ])
    setDocumentos((dData as Documento[]) ?? [])
    setProyectos((pData as Proyecto[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  function getProyectoNombre(id: string | null) {
    if (!id) return '—'
    return proyectos.find(p => p.id === id)?.nombre ?? '—'
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.file) { toast.error('Selecciona un archivo'); return }
    setSaving(true)
    const ext = form.file.name.split('.').pop()
    const path = `${Date.now()}-${form.nombre.replace(/\s+/g, '_')}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('robles-docs')
      .upload(path, form.file)
    if (uploadError) {
      toast.error('Error al subir archivo: ' + uploadError.message)
      setSaving(false)
      return
    }
    const { data: urlData } = supabase.storage.from('robles-docs').getPublicUrl(path)
    const payload = {
      nombre: form.nombre,
      tipo: form.tipo,
      proyecto_id: form.proyecto_id || null,
      url_archivo: urlData.publicUrl,
      subido_por: user?.id ?? null,
    }
    const { error } = await supabase.from('documentos').insert(payload)
    if (error) {
      toast.error('Error al guardar: ' + error.message)
    } else {
      toast.success('Documento subido')
      setOpen(false)
      setForm({ nombre: '', tipo: '', proyecto_id: '', file: null })
      fetchData()
    }
    setSaving(false)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Documentos</h1>
        {canUpload && (
          <button onClick={() => setOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors">
            <Upload size={16} /> Subir Documento
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
                {['Nombre', 'Tipo', 'Proyecto', 'Fecha Subida', 'Archivo'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {documentos.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No hay documentos</td></tr>
              ) : documentos.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{d.nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{d.tipo}</td>
                  <td className="px-4 py-3 text-gray-600">{getProyectoNombre(d.proyecto_id)}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(d.created_at).toLocaleDateString('es-MX')}</td>
                  <td className="px-4 py-3">
                    <a href={d.url_archivo} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-amber-600 hover:text-amber-700 font-medium text-xs">
                      <ExternalLink size={13} /> Descargar
                    </a>
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
                  <Dialog.Title className="text-lg font-semibold text-slate-800">Subir Documento</Dialog.Title>
                  <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>
                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                    <input required value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                    <input required value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                      placeholder="ej. Contrato, Plano, Factura"
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Archivo *</label>
                    <input required type="file"
                      onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] ?? null }))}
                      className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setOpen(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                    <button type="submit" disabled={saving}
                      className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2">
                      {saving && <div className="border-2 border-white border-t-transparent rounded-full w-4 h-4 animate-spin" />}
                      Subir
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
