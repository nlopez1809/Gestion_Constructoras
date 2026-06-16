import { useEffect, useState, type FormEvent } from 'react'
import { Plus, TrendingUp, TrendingDown, DollarSign, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { finanzasApi, proyectosApi } from '@/lib/api'
import { useAuthContext } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import type { MovimientoFinanciero, Proyecto } from '@/types'

const CATEGORIAS_INGRESO = ['Venta de inmueble','Anticipo de cliente','Alquiler','Financiamiento','Otro ingreso']
const CATEGORIAS_EGRESO  = ['Materiales','Mano de obra','Maquinaria','Servicios','Impuestos','Administrativo','Otro egreso']

export function Finanzas() {
  const { canDo }                         = useAuthContext()
  const [movimientos, setMovimientos]     = useState<MovimientoFinanciero[]>([])
  const [proyectos, setProyectos]         = useState<Proyecto[]>([])
  const [loading, setLoading]             = useState(true)
  const [filtroTipo, setFiltroTipo]       = useState<'todos'|'INGRESO'|'EGRESO'>('todos')
  const [modal, setModal]                 = useState(false)
  const [saving, setSaving]               = useState(false)
  const [form, setForm] = useState({
    tipo: 'INGRESO', categoria: '', descripcion: '', monto: '',
    fecha: new Date().toISOString().split('T')[0], proyectoId: '',
  })

  const canWrite = canDo('finanzas_write')
  const canRead  = canDo('finanzas_read')

  const load = () => {
    setLoading(true)
    Promise.all([
      finanzasApi.movimientos(),
      proyectosApi.list(),
    ])
      .then(([mov, proys]) => {
        setMovimientos(((mov as { data?: MovimientoFinanciero[] }).data ?? mov) as MovimientoFinanciero[])
        setProyectos(((proys as { data?: Proyecto[] }).data ?? proys) as Proyecto[])
      })
      .catch(() => toast.error('Error al cargar finanzas'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.descripcion || !form.monto || !form.fecha) return toast.error('Completa los campos requeridos')
    setSaving(true)
    try {
      await finanzasApi.crear({
        tipo: form.tipo, categoria: form.categoria || null,
        descripcion: form.descripcion, monto: parseFloat(form.monto),
        fecha: form.fecha, proyectoId: form.proyectoId || null,
      })
      toast.success('Transacción registrada'); setModal(false); load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar')
    } finally {
      setSaving(false)
    }
  }

  const fmt = (n: number) => `Bs. ${n.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`

  const filtered      = movimientos.filter(t => filtroTipo === 'todos' || t.tipo === filtroTipo)
  const totalIngresos = movimientos.filter(t => t.tipo === 'INGRESO').reduce((s, t) => s + t.monto, 0)
  const totalEgresos  = movimientos.filter(t => t.tipo === 'EGRESO').reduce((s, t) => s + t.monto, 0)
  const balance       = totalIngresos - totalEgresos

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
          <p className="text-sm text-gray-500 mt-1">{movimientos.length} transacciones registradas</p>
        </div>
        {canWrite && (
          <Button onClick={() => {
            setForm({ tipo: 'INGRESO', categoria: '', descripcion: '', monto: '', fecha: new Date().toISOString().split('T')[0], proyectoId: '' })
            setModal(true)
          }}>
            <Plus size={16} />Nueva Transacción
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-verde-700 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2"><TrendingUp size={18} /><p className="text-sm font-medium opacity-80">Total Ingresos</p></div>
          <p className="text-2xl font-bold">{fmt(totalIngresos)}</p>
        </div>
        <div className="bg-red-600 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2"><TrendingDown size={18} /><p className="text-sm font-medium opacity-80">Total Egresos</p></div>
          <p className="text-2xl font-bold">{fmt(totalEgresos)}</p>
        </div>
        <div className={`${balance >= 0 ? 'bg-blue-600' : 'bg-orange-600'} rounded-xl p-5 text-white`}>
          <div className="flex items-center gap-2 mb-2"><DollarSign size={18} /><p className="text-sm font-medium opacity-80">Balance</p></div>
          <p className="text-2xl font-bold">{fmt(balance)}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(['todos', 'INGRESO', 'EGRESO'] as const).map(t => (
          <button key={t} onClick={() => setFiltroTipo(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filtroTipo === t ? 'bg-verde-700 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {t === 'todos' ? 'Todos' : t === 'INGRESO' ? 'Ingresos' : 'Egresos'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="bg-white rounded-xl h-14 animate-pulse border border-gray-100" />)}</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">{t.fecha?.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <Badge className={t.tipo === 'INGRESO' ? 'bg-verde-100 text-verde-800' : 'bg-red-100 text-red-800'}>
                      {t.tipo === 'INGRESO' ? '↑ Ingreso' : '↓ Egreso'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{t.categoria ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{t.descripcion}</td>
                  <td className={`px-4 py-3 text-sm font-semibold ${t.tipo === 'INGRESO' ? 'text-verde-700' : 'text-red-600'}`}>
                    {t.tipo === 'INGRESO' ? '+' : '-'}{fmt(t.monto)}
                  </td>
                  <td className="px-4 py-3">
                    {canWrite && (
                      <button className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 size={14} />
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

      <Modal open={modal} onClose={() => setModal(false)} title="Nueva Transacción">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setForm(f => ({ ...f, tipo: 'INGRESO', categoria: '' }))}
              className={`py-2.5 rounded-lg border-2 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${form.tipo === 'INGRESO' ? 'border-verde-600 bg-verde-50 text-verde-700' : 'border-gray-200 text-gray-500'}`}>
              <TrendingUp size={16} />Ingreso
            </button>
            <button type="button" onClick={() => setForm(f => ({ ...f, tipo: 'EGRESO', categoria: '' }))}
              className={`py-2.5 rounded-lg border-2 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${form.tipo === 'EGRESO' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500'}`}>
              <TrendingDown size={16} />Egreso
            </button>
          </div>
          <Select label="Categoría" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
            placeholder="Selecciona categoría"
            options={(form.tipo === 'INGRESO' ? CATEGORIAS_INGRESO : CATEGORIAS_EGRESO).map(c => ({ value: c, label: c }))} />
          <Textarea label="Descripción *" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} required rows={2} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Monto (BOB) *" type="number" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} required />
            <Input label="Fecha *" type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required />
          </div>
          <Select label="Proyecto (opcional)" value={form.proyectoId} onChange={e => setForm(f => ({ ...f, proyectoId: e.target.value }))}
            placeholder="Sin proyecto asociado" options={proyectos.map(p => ({ value: p.id, label: p.nombre }))} />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Registrar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
