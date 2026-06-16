import { useState, type FormEvent } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { TreePine, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthContext } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { CARGO_OPTIONS } from '@/lib/constants'

export function Register() {
  const { user, signUp } = useAuthContext()
  const [form, setForm] = useState({
    nombres: '', apellidos: '', cargo: '', email: '', password: '', confirm: '',
  })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const pwdStrength = (p: string) => {
    let s = 0
    if (p.length >= 8) s++
    if (/[A-Z]/.test(p)) s++
    if (/[0-9]/.test(p)) s++
    if (/[^A-Za-z0-9]/.test(p)) s++
    return s
  }
  const strength = pwdStrength(form.password)
  const strengthColors = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-verde-500']
  const strengthLabels = ['', 'Muy débil', 'Débil', 'Aceptable', 'Fuerte ✓']

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.nombres || !form.apellidos || !form.cargo || !form.email || !form.password)
      return toast.error('Completa todos los campos')
    if (form.password.length < 8) return toast.error('La contraseña debe tener al menos 8 caracteres')
    if (form.password !== form.confirm) return toast.error('Las contraseñas no coinciden')
    setLoading(true)
    try {
      await signUp(form.email, form.password, {
        nombres: form.nombres, apellidos: form.apellidos, cargo: form.cargo,
      })
      toast.success('Cuenta creada. Tu acceso será activado por el administrador.')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-verde-900 via-verde-800 to-cafe-700 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-verde-800 to-verde-700 px-8 py-6 text-center">
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-content-center flex items-center justify-center">
                <TreePine className="w-6 h-6 text-white" />
              </div>
            </div>
            <h1 className="font-script text-2xl text-white">Robles Edificios</h1>
            <p className="text-verde-200 text-xs mt-0.5 tracking-widest uppercase">Solicitar Acceso</p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
            <p className="text-center text-xs text-gray-500">
              Tu cuenta será revisada y activada por el administrador del sistema.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {[['nombres','Nombres','Ej. Juan Carlos'],['apellidos','Apellidos','Ej. Pérez Quispe']].map(([k,l,p]) => (
                <div key={k} className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">{l}</label>
                  <input
                    value={form[k as keyof typeof form]}
                    onChange={set(k)}
                    placeholder={p}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-verde-500"
                    required
                  />
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Cargo</label>
              <select
                value={form.cargo}
                onChange={set('cargo')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-verde-500"
                required
              >
                <option value="">— Selecciona tu cargo —</option>
                {CARGO_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Correo Electrónico</label>
              <input
                type="email" value={form.email} onChange={set('email')}
                placeholder="tucorreo@gmail.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-verde-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Contraseña</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'} value={form.password} onChange={set('password')}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full pr-10 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-verde-500"
                  required
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {form.password && (
                <div className="space-y-1">
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${strengthColors[strength]}`}
                      style={{ width: `${strength * 25}%` }} />
                  </div>
                  <p className={`text-xs ${strength < 2 ? 'text-red-500' : strength < 4 ? 'text-yellow-600' : 'text-verde-600'}`}>
                    {strengthLabels[strength]}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Confirmar Contraseña</label>
              <input
                type="password" value={form.confirm} onChange={set('confirm')}
                placeholder="Repite la contraseña"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-verde-500 ${
                  form.confirm && form.confirm !== form.password ? 'border-red-400' : 'border-gray-300'
                }`}
                required
              />
            </div>

            <Button type="submit" loading={loading} className="w-full justify-center py-2.5">
              Solicitar Acceso
            </Button>

            <p className="text-center text-xs text-gray-400">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-verde-700 font-semibold hover:underline">Inicia sesión</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
