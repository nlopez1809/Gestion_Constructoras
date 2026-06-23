// routes/auth.js — Login, registro y refresh token

const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');

const prisma = new PrismaClient();

const generarTokens = (usuario) => {
  const payload = { id: usuario.id, rol: usuario.rol };
  const accessToken  = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
  const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
  return { accessToken, refreshToken };
};

// POST /api/auth/login
router.post('/login',
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Contraseña requerida'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { email, password } = req.body;
      const usuario = await prisma.usuario.findUnique({ where: { email } });
      if (!usuario || !usuario.activo) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }
      const valido = await bcrypt.compare(password, usuario.password);
      if (!valido) return res.status(401).json({ error: 'Credenciales inválidas' });

      const { accessToken, refreshToken } = generarTokens(usuario);
      res.json({
        accessToken,
        refreshToken,
        usuario: {
          id: usuario.id, nombre: usuario.nombre,
          email: usuario.email, rol: usuario.rol
        }
      });
    } catch (err) {
      res.status(500).json({ error: 'Error al iniciar sesión' });
    }
  }
);

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ error: 'Refresh token requerido' });
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const usuario = await prisma.usuario.findUnique({ where: { id: payload.id } });
    if (!usuario || !usuario.activo) return res.status(401).json({ error: 'Usuario no válido' });
    const { accessToken, refreshToken: newRefresh } = generarTokens(usuario);
    res.json({ accessToken, refreshToken: newRefresh });
  } catch {
    res.status(401).json({ error: 'Refresh token inválido o expirado' });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  res.json({ usuario: req.usuario });
});

// POST /api/auth/register (solo ADMIN)
router.post('/register',
  auth,
  body('nombre').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 8 }).withMessage('Mínimo 8 caracteres'),
  body('rol').isIn(['ADMIN','GERENCIA','FINANZAS','COMERCIAL','OBRA','RRHH','LEGAL']),
  async (req, res) => {
    if (req.usuario.rol !== 'ADMIN') return res.status(403).json({ error: 'Solo admins pueden registrar usuarios' });
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const { nombre, email, password, rol } = req.body;
      const existe = await prisma.usuario.findUnique({ where: { email } });
      if (existe) return res.status(409).json({ error: 'Email ya registrado' });
      const hash = await bcrypt.hash(password, 12);
      const nuevo = await prisma.usuario.create({
        data: { nombre, email, password: hash, rol },
        select: { id: true, nombre: true, email: true, rol: true }
      });
      res.status(201).json({ usuario: nuevo });
    } catch (err) {
      res.status(500).json({ error: 'Error al registrar usuario' });
    }
  }
);

// PUT /api/auth/password — cambiar contraseña
router.put('/password', auth,
  body('actual').notEmpty(),
  body('nueva').isLength({ min: 8 }),
  async (req, res) => {
    try {
      const usuario = await prisma.usuario.findUnique({ where: { id: req.usuario.id } });
      const valido = await bcrypt.compare(req.body.actual, usuario.password);
      if (!valido) return res.status(400).json({ error: 'Contraseña actual incorrecta' });
      const hash = await bcrypt.hash(req.body.nueva, 12);
      await prisma.usuario.update({ where: { id: req.usuario.id }, data: { password: hash } });
      res.json({ mensaje: 'Contraseña actualizada correctamente' });
    } catch {
      res.status(500).json({ error: 'Error al cambiar contraseña' });
    }
  }
);

// GET /api/auth/usuarios — listar usuarios (para selectores de vendedor, etc.)
router.get('/usuarios', auth, async (req, res) => {
  try {
    const { rol } = req.query;
    const where = { activo: true };
    if (rol) where.rol = rol;
    const usuarios = await prisma.usuario.findMany({
      where,
      select: { id: true, nombre: true, email: true, rol: true },
      orderBy: { nombre: 'asc' }
    });
    res.json(usuarios);
  } catch {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

module.exports = router;
