# 🌳 Robles Edificios — Sistema de Gestión Interno

Stack: **React 18 + TypeScript + Vite + Supabase + Netlify + Tailwind CSS**

---

## PASO 1 — Crear cuenta en Supabase

1. Ve a https://supabase.com y crea una cuenta gratuita
2. Clic en **"New Project"**
   - Nombre: `robles-edificios`
   - Contraseña de BD: (guárdala bien)
   - Región: `South America (São Paulo)` — la más cercana a Bolivia
3. Espera ~2 minutos a que el proyecto se cree
4. Ve a **Settings → API** y copia:
   - `Project URL`  →  la necesitas en el `.env.local`
   - `anon public key` →  la necesitas en el `.env.local`

---

## PASO 2 — Ejecutar el SQL en Supabase

1. En tu proyecto Supabase ve a **SQL Editor → New Query**
2. Pega todo el contenido del archivo `supabase_schema.sql`
3. Clic en **Run** (o Ctrl+Enter)
4. Verás "Success" — las tablas, triggers, RLS y el bucket de storage quedan creados

---

## PASO 3 — Configurar variables de entorno

Copia el archivo de ejemplo y rellénalo:

```bash
cp .env.example .env.local
```

Edita `.env.local`:
```env
VITE_SUPABASE_URL=https://TU_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

---

## PASO 4 — Correr en local

```bash
npm install
npm run dev
```

Abre http://localhost:5173

---

## PASO 5 — Crear cuenta en Netlify y desplegar

1. Sube el proyecto a **GitHub** (crea un repositorio nuevo)
   ```bash
   git init
   git add .
   git commit -m "Initial commit — Robles Edificios"
   git remote add origin https://github.com/TU_USUARIO/robles-edificios.git
   git push -u origin main
   ```

2. Ve a https://netlify.com y crea cuenta gratuita

3. Clic en **"Add new site" → "Import an existing project" → GitHub**

4. Selecciona el repositorio `robles-edificios`

5. Netlify detecta Vite automáticamente:
   - Build command: `npm run build`
   - Publish directory: `dist`

6. En **"Environment variables"** agrega:
   - `VITE_SUPABASE_URL` = tu URL de Supabase
   - `VITE_SUPABASE_ANON_KEY` = tu anon key

7. Clic en **Deploy site** — en ~2 minutos tu sistema estará en línea

8. En Supabase → **Authentication → URL Configuration** agrega tu URL de Netlify
   como "Site URL" (ej: `https://robles-edificios.netlify.app`)

---

## PASO 6 — Crear el primer administrador

1. Regístrate en el sistema con tu correo
2. Ve a Supabase → **Table Editor → profiles**
3. Busca tu registro y cambia `rol` de `viewer` a `admin`
4. Desde ahí podrás gestionar los roles del resto del personal

---

## Módulos del sistema

| Módulo | Roles con acceso |
|---|---|
| Dashboard | Todos |
| Proyectos (ver) | Todos |
| Proyectos (crear/editar) | Admin, Gerente |
| Personal / RRHH | Todos (editar solo Admin) |
| Inventario (ver) | Todos |
| Inventario (mover stock) | Admin, Gerente, Maestro |
| Finanzas (ver) | Admin, Gerente, Contador |
| Finanzas (registrar) | Admin, Contador |
| Documentos (ver) | Todos |
| Documentos (subir) | Admin, Gerente, Ingeniero |
| Reportes | Admin, Gerente, Contador |

## Roles disponibles

- `admin` — Acceso total
- `gerente` — Gestión de proyectos e inventario
- `ingeniero` — Ver y subir documentos
- `maestro` — Manejo de inventario
- `contador` — Finanzas y reportes
- `ventas` — Vista general
- `viewer` — Solo lectura
