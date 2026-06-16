import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  title?: string
  action?: ReactNode
}

export function Card({ children, className = '', title, action }: CardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          {title && <h3 className="font-semibold text-gray-900">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}

export function StatCard({
  label, value, icon, color = 'verde', sub,
}: {
  label: string
  value: string | number
  icon: ReactNode
  color?: 'verde' | 'cafe' | 'blue' | 'orange' | 'red' | 'purple'
  sub?: string
}) {
  const colors = {
    verde:  'bg-verde-50 text-verde-700',
    cafe:   'bg-cafe-50  text-cafe-700',
    blue:   'bg-blue-50  text-blue-700',
    orange: 'bg-orange-50 text-orange-700',
    red:    'bg-red-50   text-red-700',
    purple: 'bg-purple-50 text-purple-700',
  }
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
      <div className={`rounded-xl p-3 ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
