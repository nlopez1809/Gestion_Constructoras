import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Proyectos from './pages/Proyectos'
import Personal from './pages/Personal'
import Inventario from './pages/Inventario'
import Finanzas from './pages/Finanzas'
import Documentos from './pages/Documentos'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="border-4 border-amber-500 border-t-transparent rounded-full w-8 h-8 animate-spin" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="proyectos" element={<Proyectos />} />
        <Route path="personal" element={<Personal />} />
        <Route path="inventario" element={<Inventario />} />
        <Route path="finanzas" element={<Finanzas />} />
        <Route path="documentos" element={<Documentos />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
