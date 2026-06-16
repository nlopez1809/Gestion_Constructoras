import { useEffect, useState } from 'react'
import { FolderKanban, Users, Package, DollarSign, TrendingUp, AlertCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { dashboardApi } from '@/lib/api'
import { useAuthContext } from '@/store/authStore'
import { StatCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ESTADO_PROYECTO_COLORS, ESTADO_PROYECTO_LABELS } from '@/lib/constants'
import type { Proyecto, Material } from '@/types'

interface DashboardKpis {
  totalProyectos?: number
  proyectosActivos?: number
  totalEmpleados?: number
  materialsBajoStock?: number
  ingresosMes?: number
  egresosMes?: number
  proyectosRecientes?: Proyecto[]
  alertasStock?: Material[]
  barData?: { mes: string; ingresos: number; egresos: number }[]
  pieData?: { name: string; value: number }[]
}

const PIE_COLORS = ['#2d5a1b', '#3d7a25', '#5a9e36', '#f59e0b', '#ef4444']

export function Dashboard() {
  const { user }  = useAuthContext()
  const [kpis, setKpis]       = useState<DashboardKpis>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi.kpis()
      .then(res => setKpis((res as { data?: DashboardKpis } & DashboardKpis).data ?? res as DashboardKpis))
      .catch(() => setKpis({}))
      .finally(() => setLoading(false))
  }, [])

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', maximumFractionDigits: 0 }).format(n)

  const proyectosRecientes: Proyecto[] = kpis.proyectosRecientes ?? []
  const alertasStock: Material[]       = kpis.alertasStock ?? []
  const barData = kpis.barData ?? []
  const pieData = kpis.pieData ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Buenos días, {user?.nombre} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">Resumen del sistema al día de hoy.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl h-24 animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Proyectos"    value={kpis.totalProyectos ?? 0}   icon={<FolderKanban size={22} />} color="verde" sub={`${kpis.proyectosActivos ?? 0} activos`} />
          <StatCard label="Personal Activo"    value={kpis.totalEmpleados ?? 0}   icon={<Users size={22} />}        color="blue" />
          <StatCard label="Ingresos del Mes"   value={fmt(kpis.ingresosMes ?? 0)} icon={<DollarSign size={22} />}   color="verde" />
          <StatCard label="Stock bajo mínimo"  value={kpis.materialsBajoStock ?? 0} icon={<AlertCircle size={22} />} color={(kpis.materialsBajoStock ?? 0) > 0 ? 'red' : 'verde'} sub="materiales" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Ingresos vs Egresos (últimos 6 meses)</h3>
          {barData.length === 0
            ? <p className="text-sm text-gray-400 text-center py-8">Sin datos financieros aún</p>
            : <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData}>
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="ingresos" fill="#2d5a1b" radius={[4, 4, 0, 0]} name="Ingresos" />
                  <Bar dataKey="egresos"  fill="#ef4444" radius={[4, 4, 0, 0]} name="Egresos" />
                </BarChart>
              </ResponsiveContainer>
          }
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Proyectos por Estado</h3>
          {pieData.length === 0
            ? <p className="text-sm text-gray-400 text-center py-8">Sin proyectos aún</p>
            : <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={80} label>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
          }
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Proyectos Recientes</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {proyectosRecientes.length === 0
              ? <p className="text-sm text-gray-400 text-center py-8">Sin proyectos registrados</p>
              : proyectosRecientes.map(p => (
                <div key={p.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{p.nombre}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.ubicacion}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Presupuesto</p>
                      <p className="text-sm font-semibold text-gray-900">{fmt(p.presupuesto)}</p>
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
            <AlertCircle size={16} className="text-red-500" />
            <h3 className="font-semibold text-gray-900">Alertas de Stock</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {alertasStock.length === 0
              ? <div className="px-6 py-8 text-center">
                  <TrendingUp size={32} className="mx-auto text-verde-400 mb-2" />
                  <p className="text-sm text-gray-400">Todo el inventario OK</p>
                </div>
              : alertasStock.slice(0, 6).map(m => (
                <div key={m.id} className="px-6 py-3">
                  <p className="text-sm font-medium text-gray-900">{m.nombre}</p>
                  <div className="flex justify-between mt-0.5">
                    <p className="text-xs text-red-600">Stock: {m.stockActual} {m.unidad}</p>
                    <p className="text-xs text-gray-400">Mín: {m.stockMinimo}</p>
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
