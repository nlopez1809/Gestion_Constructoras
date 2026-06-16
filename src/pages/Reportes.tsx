import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend, CartesianGrid } from 'recharts'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/store/authStore'
import { ESTADO_PROYECTO_LABELS, TIPO_PROYECTO_LABELS } from '@/lib/constants'

const COLORS = ['#2d5a1b','#3d7a25','#5a9e36','#f59e0b','#ef4444','#8b5cf6']

export function Reportes() {
  const { canDo } = useAuthContext()
  const [loading, setLoading] = useState(true)
  const [finData, setFinData] = useState<{mes:string,ingresos:number,egresos:number}[]>([])
  const [proyEstado, setProyEstado] = useState<{name:string,value:number}[]>([])
  const [proyTipo, setProyTipo]     = useState<{name:string,value:number}[]>([])
  const [stockData, setStockData]   = useState<{nombre:string,actual:number,minimo:number}[]>([])

  const canRead = canDo('reportes_read')

  useEffect(() => {
    if (!canRead) return
    const load = async () => {
      const [{ data: trans }, { data: proys }, { data: mats }] = await Promise.all([
        supabase.from('transacciones').select('tipo,monto,fecha').order('fecha'),
        supabase.from('proyectos').select('estado,tipo'),
        supabase.from('materiales').select('nombre,stock_actual,stock_minimo').order('nombre').limit(12),
      ])

      // Finanzas por mes
      const mmap: Record<string, { ingresos: number; egresos: number }> = {}
      ;(trans ?? []).forEach(t => {
        const m = t.fecha.slice(0, 7)
        if (!mmap[m]) mmap[m] = { ingresos: 0, egresos: 0 }
        if (t.tipo === 'ingreso') mmap[m].ingresos += t.monto
        else mmap[m].egresos += t.monto
      })
      setFinData(Object.entries(mmap).sort().slice(-12).map(([mes, v]) => ({ mes: mes.slice(5) + '/' + mes.slice(2, 4), ...v })))

      // Proyectos por estado
      const emap: Record<string, number> = {}
      ;(proys ?? []).forEach(p => { emap[p.estado] = (emap[p.estado] ?? 0) + 1 })
      setProyEstado(Object.entries(emap).map(([k, v]) => ({ name: ESTADO_PROYECTO_LABELS[k as keyof typeof ESTADO_PROYECTO_LABELS] ?? k, value: v })))

      // Proyectos por tipo
      const tmap: Record<string, number> = {}
      ;(proys ?? []).forEach(p => { tmap[p.tipo] = (tmap[p.tipo] ?? 0) + 1 })
      setProyTipo(Object.entries(tmap).map(([k, v]) => ({ name: TIPO_PROYECTO_LABELS[k as keyof typeof TIPO_PROYECTO_LABELS] ?? k, value: v })))

      setStockData((mats ?? []).map(m => ({ nombre: m.nombre.slice(0, 14), actual: m.stock_actual, minimo: m.stock_minimo })))
      setLoading(false)
    }
    load()
  }, [canRead])

  if (!canRead) return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
      No tienes permiso para ver Reportes.
    </div>
  )

  const fmt = (n: number) => `Bs.${n.toLocaleString('es-BO', { maximumFractionDigits: 0 })}`

  const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="font-semibold text-gray-900 mb-5">{title}</h3>
      {children}
    </div>
  )

  if (loading) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl h-72 animate-pulse border border-gray-100" />
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes y Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Análisis general del sistema</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Ingresos vs Egresos (últimos 12 meses)">
          {finData.length === 0
            ? <p className="text-sm text-gray-400 text-center py-12">Sin datos financieros</p>
            : <ResponsiveContainer width="100%" height={240}>
                <BarChart data={finData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `Bs.${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="ingresos" fill="#2d5a1b" radius={[4,4,0,0]} name="Ingresos" />
                  <Bar dataKey="egresos"  fill="#ef4444" radius={[4,4,0,0]} name="Egresos" />
                </BarChart>
              </ResponsiveContainer>
          }
        </ChartCard>

        <ChartCard title="Tendencia Financiera">
          {finData.length === 0
            ? <p className="text-sm text-gray-400 text-center py-12">Sin datos</p>
            : <ResponsiveContainer width="100%" height={240}>
                <LineChart data={finData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `Bs.${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="ingresos" stroke="#2d5a1b" strokeWidth={2} dot={false} name="Ingresos" />
                  <Line type="monotone" dataKey="egresos"  stroke="#ef4444" strokeWidth={2} dot={false} name="Egresos" />
                </LineChart>
              </ResponsiveContainer>
          }
        </ChartCard>

        <ChartCard title="Proyectos por Estado">
          {proyEstado.length === 0
            ? <p className="text-sm text-gray-400 text-center py-12">Sin proyectos</p>
            : <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={proyEstado} dataKey="value" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                    {proyEstado.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
          }
        </ChartCard>

        <ChartCard title="Proyectos por Tipo">
          {proyTipo.length === 0
            ? <p className="text-sm text-gray-400 text-center py-12">Sin proyectos</p>
            : <ResponsiveContainer width="100%" height={240}>
                <BarChart data={proyTipo} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3d7a25" radius={[0,4,4,0]} name="Proyectos" />
                </BarChart>
              </ResponsiveContainer>
          }
        </ChartCard>

        <div className="lg:col-span-2">
          <ChartCard title="Stock de Materiales vs Mínimo Requerido">
            {stockData.length === 0
              ? <p className="text-sm text-gray-400 text-center py-12">Sin materiales</p>
              : <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={stockData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="actual"  fill="#2d5a1b" radius={[4,4,0,0]} name="Stock Actual" />
                    <Bar dataKey="minimo"  fill="#f59e0b" radius={[4,4,0,0]} name="Stock Mínimo" />
                  </BarChart>
                </ResponsiveContainer>
            }
          </ChartCard>
        </div>
      </div>
    </div>
  )
}
