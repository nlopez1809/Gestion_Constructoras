import { useEffect, useState, type FormEvent } from 'react'
import { Plus, TrendingUp, TrendingDown, DollarSign, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import type { Transaccion, Proyecto } from '@/types'

const CATEGORIAS_INGRESO  = ['Venta de inmueble','Anticipo de cliente','Alquiler','Financiamiento','Otro ingreso']
const CATEGORIAS_EGRESO   = ['Materiales','Mano de obra','Maquinaria','Servicios','Impuestos','Administrativo','Otro egreso']

export function Finanzas() {
  const { user, canDo } = useAuthContext()
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [proyectos, setProyectos]         = useState<Proyecto[]>([])
  const [loading, setLoading]             = useState(true)
  const [filtroTipo, setFiltroTipo]       = useState<'todos'|'ingreso'|'egreso'>('todos')
  const [modal, setModal]                 = useState(false)
  const [saving, setSaving]               = useState(false)
  const [form, setForm] = useState({
    tipo: 'ingreso', categoria: '', descripcion: '', monto: '', fecha: new Date().toISOString().split('T')[0], proyecto_id: '',
  })

  const canWrite = canDo('finanzas_write')
  const canRead  = canDo('finanzas_read')

  const load = async () => {
    setLoading(true)
    const [{ data: trans }, { data: proys }] = await Promise.all([
      supabase.from('transacciones').select('*, proyecto:proyectos(nombre)').order('fecha', { ascending: false }).limit(100),
      supabase.from('proyectos').select('id,nombre').order('nombre'),
    ])
    setTransacciones((trans ?? []) as Transaccion[])
    setProyectos((proys ?? []) as Proyecto[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.descripcion || !form.monto || !form.fecha) return toast.error('Completa los campos requeridos')
    setSaving(true)
    const { error } = await supabase.from('transacciones').insert({
      tipo: form.tipo, categoria: form.categoria || null, descripcion: form.descripcion,
      monto: parseFloat(form.monto), fecha: form.fecha,
      proyecto_id: form.proyecto_id || null, registrado_por: user!.id,
    })
    if (error) toast.error('Error al registrar')
    else { toast.success('Transacción registrada'); setModal(false); load() }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta transacción?')) return
    const { error } = await supabase.from('transacciones').delete().eq('id', id)
    if (error) toast.error('Error')
    else { toast.success('Eliminada'); load() }
  }

  const fmt = (n: number) => `Bs. ${n.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`

  const filtered = transacciones.filter(t => filtroTipo === 'todos' || t.tipo === filtroTipo)
  const totalIngresos = transacciones.filter(t=>t.tipo==='ingreso').reduce((s,t)=>s+t.monto,0)
  const totalEgresos  = transacciones.filter(t=>t.tipo==='egreso').reduce((s,t)=>s+t.monto,0)
  const balance = totalIngresos - totalEgresos

  if (!canRead) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      No tienes permiso para ver Finanzas.
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finanzas y Presupuestos</h1>
          <p className="text-sm text-gray-500 mt-1">{transacciones.length} transacciones registradas</p>
        </div>
        {canWrite && (
          <Button onClick={() => { setForm({tipo:'ingreso',categoria:'',descripcion:'',monto:'',fecha:new Date().toISOString().split('T')[0],proyecto_id:''}); setModal(true) }}>
            <Plus size={16}/>Nueva Transacción
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-verde-700 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2"><TrendingUp size={18}/><p className="text-sm font-medium opacity-80">Total Ingresos</p></div>
          <p className="text-2xl font-bold">{fmt(totalIngresos)}</p>
        </div>
        <div className="bg-red-600 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2"><TrendingDown size={18}/><p className="text-sm font-medium opacity-80">Total Egresos</p></div>
          <p className="text-2xl font-bold">{fmt(totalEgresos)}</p>
        </div>
        <div className={`${balance >= 0 ? 'bg-blue-600' : 'bg-orange-600'} rounded-xl p-5 text-white`}>
          <div className="flex items-center gap-2 mb-2"><DollarSign size={18}/><p className="text-sm font-medium opacity-80">Balance</p></div>
          <p className="text-2xl font-bold">{fmt(balance)}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['todos','ingreso','egreso'] as const).map(t => (
          <button key={t} onClick={() => setFiltroTipo(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              filtroTipo === t ? 'bg-verde-700 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {t === 'todos' ? 'Todos' : t === 'ingreso' ? 'Ingresos' : 'Egresos'}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{Array.from({length:5}).map((_,i) => <div key={i} className="bg-white rounded-xl h-14 animate-pulse border border-gray-100"/>)}</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Fecha','Tipo','Categoría','Descripción','Proyecto','Monto',''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">{t.fecha}</td>
                  <td className="px-4 py-3">
                    <Badge className={t.tipo==='ingreso' ? 'bg-verde-100 text-verde-800' : 'bg-red-100 text-red-800'}>
                      {t.tipo==='ingreso' ? '↑ Ingreso' : '↓ Egreso'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{t.categoria ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{t.descripcion}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{(t.proyecto as any)?.nombre ?? '—'}</td>
                  <td className={`px-4 py-3 text-sm font-semibold ${t.tipo==='ingreso' ? 'text-verde-700' : 'text-red-600'}`}>
                    {t.tipo==='ingreso' ? '+' : '-'}{fmt(t.monto)}
                  </td>
                  <td className="px-4 py-3">
                    {canWrite && (
                      <button onClick={() => handleDelete(t.id)}
                        className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 size={14}/>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">Sin transacciones registradas</p>}
        </div>
      )}

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Nueva Transacción">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setForm(f=>({...f,tipo:'ingreso',categoria:''}))}
              className={`py-2.5 rounded-lg border-2 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${form.tipo==='ingreso' ? 'border-verde-600 bg-verde-50 text-verde-700' : 'border-gray-200 text-gray-500'}`}>
              <TrendingUp size={16}/>Ingreso
            </button>
            <button type="button" onClick={() => setForm(f=>({...f,tipo:'egreso',categoria:''}))}
              className={`py-2.5 rounded-lg border-2 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${form.tipo==='egreso' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500'}`}>
              <TrendingDown size={16}/>Egreso
            </button>
          </div>
          <Select label="Categoría" value={form.categoria} onChange={e => setForm(f=>({...f,categoria:e.target.value}))}
            placeholder="Selecciona categoría"
            options={(form.tipo==='ingreso' ? CATEGORIAS_INGRESO : CATEGORIAS_EGRESO).map(c=>({value:c,label:c}))}/>
          <Textarea label="Descripción *" value={form.descripcion} onChange={e => setForm(f=>({...f,descripcion:e.target.value}))} required rows={2}/>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Monto (BOB) *" type="number" value={form.monto} onChange={e => setForm(f=>({...f,monto:e.target.value}))} required/>
            <Input label="Fecha *" type="date" value={form.fecha} onChange={e => setForm(f=>({...f,fecha:e.target.value}))} required/>
          </div>
          <Select label="Proyecto (opcional)" value={form.proyecto_id} onChange={e => setForm(f=>({...f,proyecto_id:e.target.value}))}
            placeholder="Sin proyecto asociado" options={proyectos.map(p=>({value:p.id,label:p.nombre}))}/>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Registrar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
