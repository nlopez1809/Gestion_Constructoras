// middleware/auth.js — Verificación JWT y control de roles

const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Verifica JWT
const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.id },
      select: { id: true, nombre: true, email: true, rol: true, activo: true }
    });
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Usuario no autorizado o inactivo' });
    }
    req.usuario = usuario;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado. Inicia sesión nuevamente.' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Verifica roles permitidos
const roles = (...rolesPermitidos) => (req, res, next) => {
  if (!req.usuario) return res.status(401).json({ error: 'No autenticado' });
  if (!rolesPermitidos.includes(req.usuario.rol)) {
    return res.status(403).json({
      error: `Acceso denegado. Roles permitidos: ${rolesPermitidos.join(', ')}`
    });
  }
  next();
};

module.exports = { auth, roles };
