import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/components/AuthProvider'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Layout } from '@/components/layout/Layout'
import { Login } from '@/pages/auth/Login'
import { Register } from '@/pages/auth/Register'
import { Dashboard } from '@/pages/Dashboard'
import { Proyectos } from '@/pages/Proyectos'
import { Personal } from '@/pages/Personal'
import { Inventario } from '@/pages/Inventario'
import { Finanzas } from '@/pages/Finanzas'
import { Documentos } from '@/pages/Documentos'
import { Reportes } from '@/pages/Reportes'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: { fontSize: '14px', borderRadius: '10px' },
            success: { iconTheme: { primary: '#2d5a1b', secondary: '#fff' } },
          }}
        />
        <Routes>
          {/* Públicas */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protegidas — requieren sesión */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard"  element={<Dashboard />} />
            <Route path="/proyectos"  element={<Proyectos />} />
            <Route path="/personal"   element={<Personal />} />
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/finanzas"   element={<Finanzas />} />
            <Route path="/documentos" element={<Documentos />} />
            <Route path="/reportes"   element={<Reportes />} />
          </Route>

          {/* Redirect raíz */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
