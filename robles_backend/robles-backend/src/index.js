// Robles Edificios — Servidor principal v2
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const rateLimit = require('express-rate-limit');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true)
    cb(new Error(`CORS bloqueado: ${origin}`))
  },
  credentials: true,
}))
app.use(rateLimit({ windowMs: 15*60*1000, max: 300, message:{ error:'Demasiadas solicitudes.' } }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// RUTAS
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/dashboard',  require('./routes/dashboard'));
app.use('/api/proyectos',  require('./routes/proyectos'));
app.use('/api/unidades',   require('./routes/unidades'));
app.use('/api/clientes',   require('./routes/clientes'));
app.use('/api/ventas',     require('./routes/ventas'));
app.use('/api/cuotas',     require('./routes/cuotas'));
app.use('/api/comisiones', require('./routes/comisiones'));
app.use('/api/ordenes',    require('./routes/ordenes'));
app.use('/api/materiales', require('./routes/materiales'));
app.use('/api/gastos',     require('./routes/gastos'));
app.use('/api/finanzas',   require('./routes/finanzas'));
app.use('/api/empleados',  require('./routes/empleados'));
app.use('/api/asistencia', require('./routes/asistencia'));
app.use('/api/planilla',   require('./routes/planilla'));
app.use('/api/contratos',  require('./routes/contratos'));
app.use('/api/documentos', require('./routes/documentos'));
const { campanasRouter } = require('./routes/campanas');
app.use('/api/campanas',   campanasRouter);
app.use('/api/leads',      require('./routes/leads'));
app.use('/api/reportes',   require('./routes/reportes'));

app.get('/api/health', (req, res) => res.json({
  status: 'ok', version: '1.0.0',
  sistema: 'Robles Edificios ERP',
  timestamp: new Date().toISOString()
}));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({ error: err.message || 'Error interno' });
});

app.listen(PORT, () => {
  console.log('\n🌳 Robles Edificios ERP iniciado');
  console.log(`📡 http://localhost:${PORT}/api\n`);
  if (process.env.NODE_ENV !== 'test') require('./utils/cron');
});

module.exports = app;
