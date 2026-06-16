import { useEffect, useState } from 'react'
import { BarChart3, Download, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { reportesApi } from '@/lib/api'
import { useAuthContext } from '@/store/authStore'

interface ReporteHistorial {
  id: string
  tipo: string
  generadoEn: string
  url?: string
}

export function Reportes() {
  const { canDo }                   = useAuthContext()
  const [historial, setHistorial]   = useState<ReporteHistorial[]>([])
  const [loading, setLoading]       = useState(true)

  const canRead = canDo('reportes_read')

  const load = () => {
    setLoading(true)
    reportesApi.historial()
      .then(res => setHistorial(((res as { data?: ReporteHistorial[] }).data ?? res) as ReporteHistorial[]))
      .catch(() => setHistorial([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (canRead) load()
    else setLoading(false)
  }, [])

  if (!canRead) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      No tienes permiso para ver Reportes.
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-500 mt-1">Historial de reportes generados</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <RefreshCw size={15} />Actualizar
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-white rounded-xl h-16 animate-pulse border border-gray-100" />)}
        </div>
      ) : historial.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BarChart3 size={48} className="mx-auto mb-3 opacity-30" />
          <p>No hay reportes generados aún</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Tipo', 'Generado el', ''].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {historial.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{r.tipo}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(r.generadoEn).toLocaleString('es-BO')}
                  </td>
                  <td className="px-6 py-4">
                    {r.url && (
                      <a href={r.url} download className="flex items-center gap-1 text-xs text-verde-700 hover:underline">
                        <Download size={13} />Descargar
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
