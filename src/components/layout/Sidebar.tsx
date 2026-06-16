import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, FolderKanban, Users, Package,
  DollarSign, FileText, BarChart3, LogOut, TreePine,
} from 'lucide-react'
import { useAuthContext } from '@/store/authStore'
import { ROL_LABELS, ROL_COLORS } from '@/lib/constants'
import { Badge } from '@/components/ui/Badge'

const navItems = [
  { to: '/dashboard',   label: 'Dashboard',      icon: LayoutDashboard },
  { to: '/proyectos',   label: 'Proyectos',       icon: FolderKanban },
  { to: '/personal',    label: 'Personal / RRHH', icon: Users },
  { to: '/inventario',  label: 'Inventario',      icon: Package },
  { to: '/finanzas',    label: 'Finanzas',        icon: DollarSign },
  { to: '/documentos',  label: 'Documentos',      icon: FileText },
  { to: '/reportes',    label: 'Reportes',        icon: BarChart3 },
]

export function Sidebar() {
  const { user, signOut } = useAuthContext()

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-verde-800 flex flex-col z-30 shadow-xl">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-verde-700">
        <div className="w-10 h-10 rounded-full bg-white/15 border-2 border-verde-400 flex items-center justify-center flex-shrink-0">
          <TreePine className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-script text-xl text-white leading-none">Robles</p>
          <p className="text-verde-300 text-[10px] uppercase tracking-widest leading-none mt-0.5">Sistema Interno</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-verde-200 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon className="w-4.5 h-4.5 flex-shrink-0" size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      {user && (
        <div className="px-3 py-4 border-t border-verde-700">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-verde-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user.profile.nombres[0]}{user.profile.apellidos[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {user.profile.nombres} {user.profile.apellidos}
              </p>
              <Badge className={`text-[10px] mt-0.5 ${ROL_COLORS[user.profile.rol]}`}>
                {ROL_LABELS[user.profile.rol]}
              </Badge>
            </div>
          </div>
          <button
            onClick={signOut}
            className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-verde-300 hover:bg-white/10 hover:text-white text-sm transition-colors"
          >
            <LogOut size={15} />
            Cerrar Sesión
          </button>
        </div>
      )}
    </aside>
  )
}
