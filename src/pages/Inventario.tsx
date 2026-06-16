import { useEffect, useState, type FormEvent } from 'react'
import { Plus, Search, AlertCircle, ArrowUp, ArrowDown, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import type { Material, Proyecto } from '@/types'

const UNIDADES = ['unidad','kg','ton','m','m²','m³','litro','bolsa','rollo','caja','juego']

export function Inventario() {
  const { user, canDo } = useAuthContext()
  const [materiales, setMateriales] = useState<Material[]>([])
  const [proyectos, setProyectos]   = useState<Proyecto[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [modalMat, setModalMat]     = useState(false)
  const [modalMov, setModalMov]     = useState(false)
  const [editMat, setEditMat]       = useState<Material | null>(null)
  const [selMat, setSelMat]         = useState<Material | null>(null)
  const [saving, setSaving]         = useState(false)

  const [matForm, setMatForm] = useState({ nombre:'', unidad:'unidad', stock_actual:'', stock_minimo:'', precio_unitario:'', proveedor:'' })
  const [movForm, setMovForm] = useState({ tipo:'entrada', cantidad:'', motivo:'', proyecto_id:'' })

  const canWrite = canDo('inventario_write')

  const load = async () => {
    setLoading(true)
    const [{ data: mats }, { data: proys }] = await Promise.all([
      supabase.from('materiales').select('*').order('nombre'),
      supabase.from('proyectos').select('id,nombre').order('nombre'),
    ])
    setMateriales((mats ?? []) as Material[])
    setProyectos((proys ?? []) as Proyecto[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openNewMat = () => {
    setEditMat(null)
    setMatForm({ nombre:'', unidad:'unidad', stock_actual:'', stock_minimo:'', precio_unitario:'', proveedor:'' })
    setModalMat(true)
  }
  const openEditMat = (m: Material) => {
    setEditMat(m)
    setMatForm({ nombre:m.nombre, unidad:m.unidad, stock_actual:String(m.stock_actual), stock_minimo:String(m.stock_minimo), precio_unitario:String(m.precio_unitario), proveedor:m.proveedor??'' })
    setModalMat(true)
  }
  const openMov = (m: Material) => { setSelMat(m); setMovForm({ tipo:'entrada', cantidad:'', motivo:'', proyecto_id:'' }); setModalMov(true) }

  const handleMat = async (e: FormEvent) => {
    e.preventDefault()
    if (!matForm.nombre) return toast.error('Nombre requerido')
    setSaving(true)
    const payload = {
      nombre: matForm.nombre, unidad: matForm.unidad,
      stock_actual: parseFloat(matForm.stock_actual)||0,
      stock_minimo: parseFloat(matForm.stock_minimo)||0,
      precio_unitario: parseFloat(matForm.precio_unitario)||0,
      proveedor: matForm.proveedor || null,
      updated_at: new Date().toISOString(),
    }
    const { error } = editMat
      ? await supabase.from('materiales').update(payload).eq('id', editMat.id)
      : await supabase.from('materiales').insert(payload)
    if (error) toast.error('Error al guardar')
    else { toast.success(editMat ? 'Material actualizado' : 'Material creado'); setModalMat(false); load() }
    setSaving(false)
  }

  const handleMov = async (e: FormEvent) => {
    e.preventDefault()
    if (!selMat || !movForm.cantidad) return toast.error('Completa los campos requeridos')
    const cant = parseFloat(movForm.cantidad)
    if (movForm.tipo === 'salida' && cant > selMat.stock_actual) return toast.error('Stock insuficiente')
    setSaving(true)
    const nuevoStock = movForm.tipo === 'entrada'
      ? selMat.stock_actual + cant
      : selMat.stock_actual - cant

    const { error } = await supabase.from('movimientos_inventario').insert({
      material_id: selMat.id, tipo: movForm.tipo, cantidad: cant,
      motivo: movForm.motivo || null,
      proyecto_id: movForm.proyecto_id || null,
      realizado_por: user!.id,
    })
    if (!error) await supabase.from('materiales').update({ stock_actual: nuevoStock, updated_at: new Date().toISOString() }).eq('id', selMat.id)
    if (error) toast.error('Error al registrar movimiento')
    else { toast.success('Movimiento registrado'); setModalMov(false); load() }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este material?')) return
    const { error } = await supabase.from('materiales').delete().eq('id', id)
    if (error) toast.error('Error al eliminar')
    else { toast.success('Material eliminado'); load() }
  }

  const fmt = (n: number) => `Bs. ${n.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`

  const filtered = materiales.filter(m => m.nombre.toLowerCase().includes(search.toLowerCase()) || (m.proveedor ?? '').toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario de Materiales</h1>
          <p className="text-sm text-gray-500 mt-1">{materiales.filter(m=>m.stock_actual<=m.stock_minimo).length} materiales bajo stock mínimo</p>
        </div>
        {canWrite && <Button onClick={openNewMat}><Plus size={16}/>Nuevo Material</Button>}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar materiales..."
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-verde-500"/>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({length:6}).map((_,i) => <div key={i} className="bg-white rounded-xl h-16 animate-pulse border border-gray-100"/>)}</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Material','Unidad','Stock Actual','Stock Mínimo','Precio Unit.','Proveedor','Estado',''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(m => {
                const bajo = m.stock_actual <= m.stock_minimo
                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {bajo && <AlertCircle size={14} className="text-red-500 flex-shrink-0"/>}
                        <span className="text-sm font-medium text-gray-900">{m.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{m.unidad}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{m.stock_actual}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{m.stock_minimo}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{fmt(m.precio_unitario)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{m.proveedor ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge className={bajo ? 'bg-red-100 text-red-700' : 'bg-verde-100 text-verde-700'}>
                        {bajo ? 'Bajo mínimo' : 'OK'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {canWrite && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => openMov(m)} title="Registrar movimiento"
                            className="p-1.5 rounded-md hover:bg-verde-50 text-verde-600 hover:text-verde-700 transition-colors">
                            <ArrowUp size={14}/>
                          </button>
                          <button onClick={() => openEditMat(m)}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                            <Pencil size={14}/>
                          </button>
                          <button onClick={() => handleDelete(m.id)}
                            className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">Sin materiales registrados</p>}
        </div>
      )}

      {/* Modal Material */}
      <Modal open={modalMat} onClose={() => setModalMat(false)} title={editMat ? 'Editar Material' : 'Nuevo Material'}>
        <form onSubmit={handleMat} className="space-y-4">
          <Input label="Nombre" value={matForm.nombre} onChange={e => setMatForm(f=>({...f,nombre:e.target.value}))} required/>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Unidad" value={matForm.unidad} onChange={e => setMatForm(f=>({...f,unidad:e.target.value}))}
              options={UNIDADES.map(u=>({value:u,label:u}))}/>
            <Input label="Precio Unitario (BOB)" type="number" value={matForm.precio_unitario} onChange={e => setMatForm(f=>({...f,precio_unitario:e.target.value}))}/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Stock Actual" type="number" value={matForm.stock_actual} onChange={e => setMatForm(f=>({...f,stock_actual:e.target.value}))}/>
            <Input label="Stock Mínimo" type="number" value={matForm.stock_minimo} onChange={e => setMatForm(f=>({...f,stock_minimo:e.target.value}))}/>
          </div>
          <Input label="Proveedor" value={matForm.proveedor} onChange={e => setMatForm(f=>({...f,proveedor:e.target.value}))} placeholder="Nombre del proveedor"/>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setModalMat(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>{editMat ? 'Actualizar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Movimiento */}
      <Modal open={modalMov} onClose={() => setModalMov(false)} title={`Movimiento — ${selMat?.nombre}`} size="sm">
        <form onSubmit={handleMov} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setMovForm(f=>({...f,tipo:'entrada'}))}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-semibold transition-colors ${movForm.tipo==='entrada' ? 'border-verde-600 bg-verde-50 text-verde-700' : 'border-gray-200 text-gray-500'}`}>
              <ArrowUp size={16}/>Entrada
            </button>
            <button type="button" onClick={() => setMovForm(f=>({...f,tipo:'salida'}))}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-semibold transition-colors ${movForm.tipo==='salida' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500'}`}>
              <ArrowDown size={16}/>Salida
            </button>
          </div>
          <Input label="Cantidad" type="number" value={movForm.cantidad} onChange={e => setMovForm(f=>({...f,cantidad:e.target.value}))} required/>
          <Select label="Proyecto (opcional)" value={movForm.proyecto_id} onChange={e => setMovForm(f=>({...f,proyecto_id:e.target.value}))}
            placeholder="Sin proyecto" options={proyectos.map(p=>({value:p.id,label:p.nombre}))}/>
          <Input label="Motivo" value={movForm.motivo} onChange={e => setMovForm(f=>({...f,motivo:e.target.value}))} placeholder="Descripción del movimiento"/>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setModalMov(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Registrar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
