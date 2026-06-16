import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Proyecto, Material, Transaccion } from '../lib/types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface EstadoCount {
  estado: string
  count: number
}

const estadoLabels: Record<string, string> = {
  planificacion: 'Planificación',
  en_progreso: 'En Progreso',
  pausado: 'Pausado',
  completado: 'Completado',
  cancelado: 'Cancelado',
}

export default function Dashboard() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [materiales, setMateriales] = useState<Material[]>([])
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const [{ data: pData }, { data: mData }, { data: tData }] = await Promise.all([
        supabase.from('proyectos').select('*'),
        supabase.from('materiales').select('*'),
        supabase.from('transacciones').select('*'),
      ])
      setProyectos((pData as Proyecto[]) ?? [])
      setMateriales((mData as Material[]) ?? [])
      setTransacciones((tData as Transaccion[]) ?? [])
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="border-4 border-amber-500 border-t-transparent rounded-full w-8 h-8 animate-spin" />
      </div>
    )
  }

  const totalProyectos = proyectos.length
  const stockBajo = materiales.filter(m => m.stock_actual < m.stock_minimo).length

  const now = new Date()
  const mes = now.getMonth()
  const anio = now.getFullYear()
  const transaccionesMes = transacciones.filter(t => {
    const d = new Date(t.fecha)
    return d.getMonth() === mes && d.getFullYear() === anio
  })
  const balance = transaccionesMes.reduce((acc, t) => {
    return acc + (t.tipo === 'ingreso' ? t.monto : -t.monto)
  }, 0)

  // Bar chart data
  const estadoMap: Record<string, number> = {}
  proyectos.forEach(p => {
    estadoMap[p.estado] = (estadoMap[p.estado] ?? 0) + 1
  })
  const chartData: EstadoCount[] = Object.entries(estadoMap).map(([estado, count]) => ({
    estado: estadoLabels[estado] ?? estado,
    count,
  }))

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Total Proyectos</p>
          <p className="text-3xl font-bold text-slate-800">{totalProyectos}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Materiales con Stock Bajo</p>
          <p className="text-3xl font-bold text-red-500">{stockBajo}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Balance del Mes</p>
          <p className={`text-3xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            ${balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Proyectos por Estado</h2>
        {chartData.length === 0 ? (
          <p className="text-gray-400 text-sm">No hay datos disponibles</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="estado" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Proyectos" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
