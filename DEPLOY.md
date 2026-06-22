# Guía de Despliegue — Robles Edificios ERP

## Arquitectura

```
[Netlify]  ←→  [Railway Backend + PostgreSQL]
 Frontend       API Express + Prisma
 (HTML/JS)
```

---

## 1. Backend en Railway

### Paso 1: Crear cuenta en Railway
1. Ve a https://railway.app y crea una cuenta con GitHub
2. Haz clic en **"New Project"**

### Paso 2: Agregar PostgreSQL
1. En tu proyecto, haz clic en **"+ New"** → **"Database"** → **"PostgreSQL"**
2. Railway creará la base de datos automáticamente
3. Copia la variable `DATABASE_URL` de la pestaña **"Variables"**

### Paso 3: Desplegar el backend
1. Haz clic en **"+ New"** → **"GitHub Repo"**
2. Selecciona el repositorio `Gestion_Constructoras`
3. Railway detectará el proyecto. Configura:
   - **Root Directory**: `robles_backend/robles-backend`
   - **Start Command**: `npx prisma db push && npm run db:seed; node src/index.js`

### Paso 4: Variables de entorno
En la pestaña **Variables** del servicio backend, agrega:

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | (copiar de PostgreSQL, Railway la conecta automáticamente) |
| `JWT_SECRET` | `RoblesEdificios2026SecretKey!` (cambia esto) |
| `FRONTEND_URL` | `https://tu-app.netlify.app` (la URL que Netlify te dará) |
| `NODE_ENV` | `production` |

### Paso 5: Verificar
Una vez desplegado, Railway te da una URL como `https://tu-backend.up.railway.app`.
Visita `https://tu-backend.up.railway.app/api/health` para verificar.

---

## 2. Frontend en Netlify

### Paso 1: Crear cuenta en Netlify
1. Ve a https://app.netlify.com y crea una cuenta con GitHub

### Paso 2: Conectar repositorio
1. Haz clic en **"Add new site"** → **"Import an existing project"**
2. Selecciona GitHub → Repositorio `Gestion_Constructoras`
3. Configuración de build:
   - **Publish directory**: `public`
   - **Build command**: (dejar vacío)

### Paso 3: Configurar URL del backend
1. Edita el archivo `public/config.js`
2. Reemplaza `__API_URL__` con la URL de Railway:
   ```js
   window.VITE_API_URL = 'https://tu-backend.up.railway.app';
   ```

### Paso 4: Desplegar
Netlify desplegará automáticamente al hacer push.

---

## 3. Credenciales de acceso (demo)

| Email | Password | Rol |
|-------|----------|-----|
| `gerencia@robles.com.bo` | `Robles2026!` | Admin |
| `finanzas@robles.com.bo` | `Robles2026!` | Finanzas |
| `luis.mamani@robles.com.bo` | `Robles2026!` | Comercial |
| `ana.rios@robles.com.bo` | `Robles2026!` | Comercial |
| `rrhh@robles.com.bo` | `Robles2026!` | RRHH |

---

## Orden de despliegue

1. Railway: PostgreSQL primero
2. Railway: Backend (se conecta a la DB y corre el seed)
3. Anotar la URL del backend
4. Actualizar `public/config.js` con esa URL
5. Netlify: Frontend
6. Actualizar `FRONTEND_URL` en Railway con la URL de Netlify
