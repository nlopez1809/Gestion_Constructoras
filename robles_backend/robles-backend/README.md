# 🌳 Robles Edificios — Backend ERP

Backend completo para el Sistema Integral de Gestión de Robles Edificios SRL.  
**Node.js + Express + PostgreSQL + Prisma ORM**

---

## Requisitos

- Node.js 18+
- PostgreSQL 14+
- npm 9+

---

## Instalación local (desarrollo)

```bash
# 1. Instalar dependencias
npm install

# 2. Crear base de datos en PostgreSQL
createdb robles_db

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tu configuración

# 4. Ejecutar migraciones (crea todas las tablas)
npx prisma migrate dev --name init

# 5. Cargar datos iniciales
node scripts/seed.js

# 6. Iniciar servidor en desarrollo
npm run dev
```

El servidor queda disponible en: `http://localhost:3000/api`

---

## Variables de entorno (.env)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | Conexión PostgreSQL | `postgresql://user:pass@localhost:5432/robles_db` |
| `JWT_SECRET` | Secreto para firmar tokens | cadena aleatoria larga |
| `JWT_EXPIRES_IN` | Duración access token | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Duración refresh token | `7d` |
| `PORT` | Puerto del servidor | `3000` |
| `FRONTEND_URL` | URL del frontend (CORS) | `http://localhost:8080` |
| `SMTP_HOST` | Servidor SMTP para emails | `smtp.gmail.com` |
| `SMTP_PORT` | Puerto SMTP | `587` |
| `SMTP_USER` | Email del sistema | `sistema@robles.com.bo` |
| `SMTP_PASS` | Contraseña SMTP o App Password | — |
| `S3_BUCKET` | Bucket para documentos | `robles-documentos` |
| `S3_REGION` | Región S3/R2 | `us-east-1` |
| `S3_ACCESS_KEY` | Access key S3/R2 | — |
| `S3_SECRET_KEY` | Secret key S3/R2 | — |
| `S3_ENDPOINT` | Endpoint (solo R2) | `https://xxx.r2.cloudflarestorage.com` |
| `WHATSAPP_API_KEY` | API key 360dialog | — |
| `TC_DEFAULT` | Tipo de cambio por defecto | `7.05` |

---

## Credenciales iniciales (después del seed)

```
Email:    gerencia@robles.com.bo
Password: Robles2026!
Rol:      ADMIN
```

---

## Endpoints principales

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Login — devuelve accessToken + refreshToken |
| POST | `/api/auth/refresh` | Renovar access token |
| GET  | `/api/auth/me` | Datos del usuario autenticado |
| POST | `/api/auth/register` | Registrar usuario (solo ADMIN) |
| PUT  | `/api/auth/password` | Cambiar contraseña |

### Dashboard
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/dashboard` | KPIs consolidados, proyectos, alertas, gráfico 6 meses |

### Proyectos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/proyectos` | Lista todos los proyectos con unidades y etapas |
| GET    | `/api/proyectos/:id` | Detalle de proyecto |
| POST   | `/api/proyectos` | Crear proyecto |
| PUT    | `/api/proyectos/:id` | Actualizar proyecto |
| PATCH  | `/api/proyectos/:id/avance` | Actualizar % de avance |
| GET    | `/api/proyectos/:id/costos` | Presupuesto vs ejecutado del proyecto |
| GET    | `/api/proyectos/:id/etapas` | Etapas de obra |
| POST   | `/api/proyectos/:id/etapas` | Crear etapa |

### Ventas
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/ventas` | Lista ventas con filtros |
| GET    | `/api/ventas/resumen` | KPIs del mes |
| POST   | `/api/ventas` | Crear venta (actualiza unidad + crea cuotas + comisión) |
| GET    | `/api/ventas/clientes` | Lista clientes |
| POST   | `/api/ventas/clientes` | Crear cliente |
| GET    | `/api/ventas/:id/cuotas` | Cuotas de una venta |
| PATCH  | `/api/ventas/cuotas/:id/pagar` | Registrar pago de cuota |

### Finanzas
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/finanzas/movimientos` | Ingresos y egresos |
| POST   | `/api/finanzas/movimientos` | Registrar movimiento |
| GET    | `/api/finanzas/flujo` | Flujo de caja por mes |
| GET    | `/api/finanzas/estado-resultados` | Estado de resultados |
| GET    | `/api/finanzas/saldo-caja` | Saldo total en caja |
| GET    | `/api/finanzas/tc` | Historial tipo de cambio |
| POST   | `/api/finanzas/tc` | Registrar nuevo TC |

### RRHH
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/empleados` | Lista empleados |
| POST   | `/api/empleados` | Crear empleado |
| GET    | `/api/empleados/asistencia/semana` | Grilla de asistencia semanal |
| POST   | `/api/empleados/asistencia` | Registrar asistencia masiva |
| POST   | `/api/empleados/planilla/generar` | Generar planilla del mes |
| PATCH  | `/api/empleados/planilla/:id/aprobar` | Aprobar planilla |

### Compras
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/ordenes` | Órdenes de compra |
| POST   | `/api/ordenes` | Crear OC (crea items automáticamente) |
| PATCH  | `/api/ordenes/:id/estado` | Avanzar estado (al recibir → actualiza inventario) |
| GET    | `/api/ordenes/proveedores` | Lista proveedores |
| GET    | `/api/ordenes/inventario/materiales` | Inventario con alertas semáforo |

### Costos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/gastos` | Registro de gastos |
| POST   | `/api/gastos` | Registrar gasto (crea egreso financiero automático) |
| GET    | `/api/gastos/resumen` | Presupuesto vs ejecutado todos los proyectos |
| GET    | `/api/gastos/desviaciones` | Desviaciones por categoría y proyecto |
| GET    | `/api/gastos/rentabilidad` | Rentabilidad y margen por proyecto |

### Legal
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/contratos` | Contratos de clientes |
| POST   | `/api/contratos` | Crear contrato |
| PATCH  | `/api/contratos/:id/firmar` | Marcar como firmado |
| GET    | `/api/contratos/proveedores` | Contratos proveedores |
| GET    | `/api/contratos/alertas` | Vencimientos próximos |
| GET    | `/api/documentos` | Repositorio de documentos |
| POST   | `/api/documentos` | Subir documento (multipart) |

### Marketing
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/campanas` | Campañas con métricas ROAS |
| POST   | `/api/campanas` | Crear campaña |
| GET    | `/api/campanas/resumen` | KPIs del mes |
| GET    | `/api/leads` | Lista leads |
| POST   | `/api/leads` | Crear lead |
| PATCH  | `/api/leads/:id/estado` | Avanzar en el embudo |
| GET    | `/api/leads/embudo` | Funnel de conversión |

### Reportes
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/reportes/excel/ventas` | Descargar Excel de ventas |
| GET    | `/api/reportes/excel/planilla` | Descargar planilla Excel |
| GET    | `/api/reportes/excel/gastos` | Descargar Excel de gastos |
| GET    | `/api/reportes/historial` | Historial de reportes generados |
| GET    | `/api/reportes/programados` | Reportes automáticos |
| POST   | `/api/reportes/programados` | Crear reporte programado |

---

## Roles y permisos

| Rol | Acceso |
|-----|--------|
| `ADMIN` | Todo el sistema |
| `GERENCIA` | Lectura y escritura en todos los módulos |
| `FINANZAS` | Finanzas, costos, reportes (sin RRHH privado) |
| `COMERCIAL` | Ventas, clientes, leads, marketing |
| `OBRA` | Proyectos, compras, inventario, asistencia |
| `RRHH` | Empleados, asistencia, planilla |
| `LEGAL` | Contratos, documentos |

---

## Despliegue en producción (VPS Contabo/DigitalOcean)

```bash
# 1. Instalar Node.js 18 en el servidor
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Instalar PM2 (process manager)
npm install -g pm2

# 3. Clonar el proyecto y configurar .env
git clone https://tu-repo/robles-backend.git
cd robles-backend
npm install --production
cp .env.example .env
# Editar .env con valores de producción

# 4. Migrar BD y seed
npx prisma migrate deploy
node scripts/seed.js

# 5. Iniciar con PM2
pm2 start src/index.js --name "robles-api"
pm2 save
pm2 startup

# 6. Nginx como proxy reverso (opcional)
# server {
#   listen 80;
#   server_name api.roblesedificios.com.bo;
#   location / {
#     proxy_pass http://localhost:3000;
#     proxy_set_header Host $host;
#     proxy_set_header X-Real-IP $remote_addr;
#   }
# }
```

---

## Estructura del proyecto

```
robles-backend/
├── prisma/
│   └── schema.prisma          ← Esquema completo BD (todas las tablas)
├── scripts/
│   └── seed.js                ← Datos iniciales de Robles Edificios
├── src/
│   ├── index.js               ← Servidor Express + rutas + CRON
│   ├── middleware/
│   │   └── auth.js            ← JWT + control de roles
│   ├── routes/
│   │   ├── auth.js            ← Login, registro, refresh
│   │   ├── dashboard.js       ← KPIs consolidados
│   │   ├── proyectos.js       ← CRUD proyectos, etapas, costos
│   │   ├── unidades.js        ← CRUD unidades por proyecto
│   │   ├── clientes.js        ← CRUD clientes
│   │   ├── ventas.js          ← Ventas, cuotas, pago de cuotas
│   │   ├── cuotas.js          ← Gestión de cuotas
│   │   ├── comisiones.js      ← Comisiones vendedores
│   │   ├── ordenes.js         ← OC, proveedores, inventario
│   │   ├── materiales.js      ← Inventario de materiales
│   │   ├── gastos.js          ← Costos, desviaciones, rentabilidad
│   │   ├── finanzas.js        ← Movimientos, flujo caja, TC
│   │   ├── empleados.js       ← RRHH, asistencia, planilla AFP
│   │   ├── asistencia.js      ← Control de asistencia
│   │   ├── planilla.js        ← Planilla mensual
│   │   ├── contratos.js       ← Contratos clientes y proveedores
│   │   ├── documentos.js      ← Repositorio documentos (S3/R2)
│   │   ├── campanas.js        ← Campañas y leads marketing
│   │   ├── leads.js           ← Gestión de leads
│   │   └── reportes.js        ← Excel export, historial, programados
│   └── utils/
│       └── cron.js            ← Alertas automáticas WA + email + reportes
├── .env.example               ← Variables de entorno
├── package.json
└── README.md
```

---

## Tecnologías

| Tecnología | Versión | Uso |
|------------|---------|-----|
| Node.js | 18+ | Runtime |
| Express | 4.18 | Framework HTTP |
| Prisma | 5.7 | ORM + migraciones |
| PostgreSQL | 14+ | Base de datos principal |
| bcryptjs | 2.4 | Hash de contraseñas |
| jsonwebtoken | 9.0 | Autenticación JWT |
| ExcelJS | 4.4 | Generación de reportes Excel |
| Puppeteer | 21 | Generación de PDF (configurar) |
| multer | 1.4 | Upload de archivos |
| nodemailer | 6.9 | Envío de emails SMTP |
| node-cron | 3.0 | Tareas programadas |
| helmet | 7.1 | Seguridad HTTP headers |
| express-rate-limit | 7.1 | Rate limiting |
| dayjs | 1.11 | Manejo de fechas |

---

*Robles Edificios SRL · Cochabamba, Bolivia · Sistema ERP v1.0*
