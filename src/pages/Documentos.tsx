import { useEffect, useState, type FormEvent } from 'react'
import { Plus, Search, FileText, Download, Trash2, File } from 'lucide-react'
import toast from 'react-hot-toast'
import { documentosApi, proyectosApi } from '@/lib/api'
import { useAuthContext } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { TIPO_DOC_LABELS } from '@/lib/constants'
import type { Documento, Proyecto, TipoDocumento } from '@/types'

const tipoOptions = Object.entries(TIPO_DOC_LABELS).map(([value, label]) => ({ value, label }))

export function Documentos() {
  const { canDo }                   = useAuthContext()
  const [docs, setDocs]             = useState<Documento[]>([])
  const [proyectos, setProyectos]   = useState<Proyecto[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [modal, setModal]           = useState(false)
  const [saving, setSaving]         = useState(false)
  const [file, setFile]             = useState<File | null>(null)
  const [form, setForm] = useState({ nombre: '', tipo: 'OTRO' as TipoDocumento, proyectoId: '' })

  const canWrite = canDo('documentos_write')

  const load = () => {
    setLoading(true)
    Promise.all([documentosApi.list(), proyectosApi.list()])
      .then(([d, p]) => {
        setDocs(((d as { data?: Documento[] }).data ?? d) as Documento[])
        setProyectos(((p as { data?: Proyecto[] }).data ?? p) as Proyecto[])
      })
      .catch(() => toast.error('Error al cargar documentos'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.nombre) return toast.error('Nombre requerido')
    if (!file) return toast.error('Selecciona un archivo')
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('nombre', form.nombre)
      fd.append('tipo', form.tipo)
      if (form.proyectoId) fd.append('proyectoId', form.proyectoId)
      await documentosApi.subir(fd)
      toast.success('Documento subido'); setModal(false); load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (doc: Documento) => {
    if (!confirm('¿Eliminar este documento?')) return
    try {
      await documentosApi.delete(doc.id)
      toast.success('Documento eliminado'); load()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const filtered = docs.filter(d => {
    const matchSearch = d.nombre.toLowerCase().includes(search.toLowerCase())
    const matchTipo   = filtroTipo === 'todos' || d.tipo === filtroTipo
    return matchSearch && matchTipo
  })

  const fmtSize = (kb: number | null) => !kb ? '—' : kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`

  const iconColor: Record<string, string> = {
    PLANO: 'text-blue-600', CONTRATO: 'text-purple-600',
    PERMISO: 'text-orange-600', REPORTE: 'text-verde-600', OTRO: 'text-gray-500',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentos y Planos</h1>
          <p className="text-sm text-gray-500 mt-1">{docs.length} documentos almacenados</p>
        </div>
        {canWrite && (
          <Button onClick={() => { setForm({ nombre: '', tipo: 'OTRO', proyectoId: '' }); setFile(null); setModal(true) }}>
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
                <div className={`flex-shrink-0 ${iconColor[doc.tipo ?? 'OTRO']}`}>
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
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-400">
                      {fmtSize(doc.tamañoKb)} · {new Date(doc.createdAt).toLocaleDateString('es-BO')}
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
          <Select label="Proyecto (opcional)" value={form.proyectoId}
            onChange={e => setForm(f => ({ ...f, proyectoId: e.target.value }))}
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
