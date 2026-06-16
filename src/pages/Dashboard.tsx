import { useEffect, useState } from 'react'
import { FolderKanban, Users, Package, DollarSign, TrendingUp, AlertCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/store/authStore'
import { StatCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ESTADO_PROYECTO_COLORS, ESTADO_PROYECTO_LABELS } from '@/lib/constants'
import type { Proyecto, Material } from '@/types'

interface Stats {
  proyectos: number
  proyectosActivos: number
  personal: number
  materialsBajoStock: number
  ingresos: number
  egresos: number
}

const PIE_COLORS = ['#2d5a1b','#3d7a25','#5a9e36','#f59e0b','#ef4444']

export function Dashboard() {
  const { user } = useAuthContext()
  const [stats, setStats]           = useState<Stats>({ proyectos:0, proyectosActivos:0, personal:0, materialsBajoStock:0, ingresos:0, egresos:0 })
  const [proyectos, setProyectos]   = useState<Proyecto[]>([])
  const [alertas, setAlertas]       = useState<Material[]>([])
  const [loading, setLoading]       = useState(true)
  const [barData, setBarData]       = useState<{mes:string,ingresos:number,egresos:number}[]>([])
  const [pieData, setPieData]       = useState<{name:string,value:number}[]>([])

  useEffect(() => {
    const load = async () => {
      const [
        { count: totalP },
        { data: proys },
        { count: totalPersonal },
        { data: mats },
        { data: trans },
      ] = await Promise.all([
        supabase.from('proyectos').select('*', { count: 'exact', head: true }),
        supabase.from('proyectos').select('*, responsable:profiles(nombres,apellidos)').order('created_at', { ascending: false }).limit(5),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('materiales').select('*'),
        supabase.from('transacciones').select('*').gte('fecha', new Date(Date.now() - 180*24*60*60*1000).toISOString().split('T')[0]),
      ])

      const activos = (proys ?? []).filter(p => p.estado === 'en_proceso').length
      const bajoStock = (mats ?? []).filter(m => m.stock_actual <= m.stock_minimo)
      const ingresos = (trans ?? []).filter(t => t.tipo === 'ingreso').reduce((s,t) => s + t.monto, 0)
      const egresos  = (trans ?? []).filter(t => t.tipo === 'egreso').reduce((s,t) => s + t.monto, 0)

      setStats({ proyectos: totalP ?? 0, proyectosActivos: activos, personal: totalPersonal ?? 0, materialsBajoStock: bajoStock.length, ingresos, egresos })
      setProyectos((proys ?? []) as Proyecto[])
      setAlertas(bajoStock as Material[])

      // Bar chart: group transactions by month
      const monthMap: Record<string, {ingresos:number,egresos:number}> = {}
      ;(trans ?? []).forEach(t => {
        const mes = t.fecha.slice(0,7)
        if (!monthMap[mes]) monthMap[mes] = { ingresos: 0, egresos: 0 }
        if (t.tipo === 'ingreso') monthMap[mes].ingresos += t.monto
        else monthMap[mes].egresos += t.monto
      })
      setBarData(Object.entries(monthMap).sort().slice(-6).map(([mes, v]) => ({ mes: mes.slice(5)+'/'+mes.slice(0,4), ...v })))

      // Pie chart: proyectos por tipo
      const tipoMap: Record<string, number> = {}
      ;(proys ?? []).forEach(p => { tipoMap[p.tipo] = (tipoMap[p.tipo] ?? 0) + 1 })
      setPieData(Object.entries(tipoMap).map(([name, value]) => ({ name, value })))

      setLoading(false)
    }
    load()
  }, [])

  const fmt = (n: number) => new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Buenos días, {user?.profile.nombres} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">Aquí está el resumen del sistema al día de hoy.</p>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({length:4}).map((_,i) => (
            <div key={i} className="bg-white rounded-xl h-24 animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Proyectos" value={stats.proyectos} icon={<FolderKanban size={22}/>} color="verde" sub={`${stats.proyectosActivos} en proceso`}/>
          <StatCard label="Personal Activo" value={stats.personal} icon={<Users size={22}/>} color="blue"/>
          <StatCard label="Balance Ingresos" value={fmt(stats.ingresos)} icon={<DollarSign size={22}/>} color="verde" sub="Últimos 6 meses"/>
          <StatCard label="Stock bajo mínimo" value={stats.materialsBajoStock} icon={<AlertCircle size={22}/>} color={stats.materialsBajoStock > 0 ? 'red' : 'verde'} sub="materiales"/>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Ingresos vs Egresos (últimos 6 meses)</h3>
          {barData.length === 0
            ? <p className="text-sm text-gray-400 text-center py-8">Sin datos financieros aún</p>
            : <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData}>
                  <XAxis dataKey="mes" tick={{fontSize:12}} />
                  <YAxis tick={{fontSize:12}} />
                  <Tooltip formatter={(v:number) => fmt(v)} />
                  <Bar dataKey="ingresos" fill="#2d5a1b" radius={[4,4,0,0]} name="Ingresos"/>
                  <Bar dataKey="egresos"  fill="#ef4444" radius={[4,4,0,0]} name="Egresos"/>
                </BarChart>
              </ResponsiveContainer>
          }
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Proyectos por Tipo</h3>
          {pieData.length === 0
            ? <p className="text-sm text-gray-400 text-center py-8">Sin proyectos aún</p>
            : <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={80} label>
                    {pieData.map((_,i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
          }
        </div>
      </div>

      {/* Recent projects + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Proyectos Recientes</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {proyectos.length === 0
              ? <p className="text-sm text-gray-400 text-center py-8">Sin proyectos registrados</p>
              : proyectos.map(p => (
                <div key={p.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{p.nombre}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.ubicacion ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Presupuesto</p>
                      <p className="text-sm font-semibold text-gray-900">{fmt(p.presupuesto_total)}</p>
                    </div>
                    <Badge className={ESTADO_PROYECTO_COLORS[p.estado]}>
                      {ESTADO_PROYECTO_LABELS[p.estado]}
                    </Badge>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500"/>
            <h3 className="font-semibold text-gray-900">Alertas de Stock</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {alertas.length === 0
              ? <div className="px-6 py-8 text-center">
                  <TrendingUp size={32} className="mx-auto text-verde-400 mb-2"/>
                  <p className="text-sm text-gray-400">Todo el inventario OK</p>
                </div>
              : alertas.slice(0,6).map(m => (
                <div key={m.id} className="px-6 py-3">
                  <p className="text-sm font-medium text-gray-900">{m.nombre}</p>
                  <div className="flex justify-between mt-0.5">
                    <p className="text-xs text-red-600">Stock: {m.stock_actual} {m.unidad}</p>
                    <p className="text-xs text-gray-400">Mín: {m.stock_minimo}</p>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}
