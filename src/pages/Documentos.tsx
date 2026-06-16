import { useEffect, useState, type FormEvent } from 'react'
import { Plus, Search, FileText, Download, Trash2, File } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { TIPO_DOC_LABELS } from '@/lib/constants'
import type { Documento, Proyecto, TipoDocumento } from '@/types'

const tipoOptions = Object.entries(TIPO_DOC_LABELS).map(([value, label]) => ({ value, label }))

export function Documentos() {
  const { user, canDo } = useAuthContext()
  const [docs, setDocs]           = useState<Documento[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [modal, setModal]         = useState(false)
  const [saving, setSaving]       = useState(false)
  const [file, setFile]           = useState<File | null>(null)
  const [form, setForm] = useState({ nombre: '', tipo: 'otro' as TipoDocumento, proyecto_id: '' })

  const canWrite = canDo('documentos_write')

  const load = async () => {
    setLoading(true)
    const [{ data: d }, { data: p }] = await Promise.all([
      supabase.from('documentos').select('*, proyecto:proyectos(nombre), subido:profiles(nombres,apellidos)').order('created_at', { ascending: false }),
      supabase.from('proyectos').select('id,nombre').order('nombre'),
    ])
    setDocs((d ?? []) as Documento[])
    setProyectos((p ?? []) as Proyecto[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.nombre) return toast.error('Nombre requerido')
    if (!file) return toast.error('Selecciona un archivo')
    setSaving(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `documentos/${Date.now()}-${form.nombre.replace(/\s+/g, '_')}.${ext}`
      const { error: upErr } = await supabase.storage.from('robles-docs').upload(path, file)
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('robles-docs').getPublicUrl(path)
      const { error } = await supabase.from('documentos').insert({
        nombre: form.nombre, tipo: form.tipo,
        proyecto_id: form.proyecto_id || null,
        url: publicUrl,
        tamaño_kb: Math.round(file.size / 1024),
        subido_por: user!.id,
      })
      if (error) throw error
      toast.success('Documento subido')
      setModal(false)
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al subir')
    }
    setSaving(false)
  }

  const handleDelete = async (doc: Documento) => {
    if (!confirm('¿Eliminar este documento?')) return
    await supabase.from('documentos').delete().eq('id', doc.id)
    toast.success('Documento eliminado')
    load()
  }

  const filtered = docs.filter(d => {
    const matchSearch = d.nombre.toLowerCase().includes(search.toLowerCase())
    const matchTipo   = filtroTipo === 'todos' || d.tipo === filtroTipo
    return matchSearch && matchTipo
  })

  const fmtSize = (kb: number | null) => !kb ? '—' : kb < 1024 ? `${kb} KB` : `${(kb/1024).toFixed(1)} MB`

  const iconColor: Record<string, string> = {
    plano: 'text-blue-600', contrato: 'text-purple-600',
    permiso: 'text-orange-600', reporte: 'text-verde-600', otro: 'text-gray-500',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentos y Planos</h1>
          <p className="text-sm text-gray-500 mt-1">{docs.length} documentos almacenados</p>
        </div>
        {canWrite && (
          <Button onClick={() => { setForm({ nombre:'', tipo:'otro', proyecto_id:'' }); setFile(null); setModal(true) }}>
            <Plus size={16} />Subir Documento
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar documentos..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-verde-500" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['todos', ...Object.keys(TIPO_DOC_LABELS)].map(t => (
            <button key={t} onClick={() => setFiltroTipo(t)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtroTipo === t ? 'bg-verde-700 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {t === 'todos' ? 'Todos' : TIPO_DOC_LABELS[t as TipoDocumento]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-white rounded-xl h-36 animate-pulse border border-gray-100" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText size={48} className="mx-auto mb-3 opacity-30" />
          <p>No hay documentos registrados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(doc => (
            <div key={doc.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 ${iconColor[doc.tipo ?? 'otro']}`}>
                  <File size={32} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{doc.nombre}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {doc.tipo && (
                      <Badge className="bg-gray-100 text-gray-600 text-[10px]">
                        {TIPO_DOC_LABELS[doc.tipo]}
                      </Badge>
                    )}
                    {(doc.proyecto as any)?.nombre && (
                      <span className="text-xs text-verde-600 truncate">{(doc.proyecto as any).nombre}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-400">
                      {fmtSize(doc.tamaño_kb)} · {new Date(doc.created_at).toLocaleDateString('es-BO')}
                    </p>
                    <div className="flex gap-1">
                      <a href={doc.url} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-md hover:bg-verde-50 text-gray-400 hover:text-verde-600 transition-colors">
                        <Download size={14} />
                      </a>
                      {canWrite && (
                        <button onClick={() => handleDelete(doc)}
                          className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Subir Documento">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre del Documento *" value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
          <Select label="Tipo" value={form.tipo}
            onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoDocumento }))}
            options={tipoOptions} />
          <Select label="Proyecto (opcional)" value={form.proyecto_id}
            onChange={e => setForm(f => ({ ...f, proyecto_id: e.target.value }))}
            placeholder="Sin proyecto" options={proyectos.map(p => ({ value: p.id, label: p.nombre }))} />
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Archivo *</label>
            <input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-verde-50 file:text-verde-700 hover:file:bg-verde-100" />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Subir</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
