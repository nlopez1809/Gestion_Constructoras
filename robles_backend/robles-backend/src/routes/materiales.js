// routes/materiales.js
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { auth, roles } = require('../middleware/auth');
const prisma = new PrismaClient();

router.get('/', auth, async (req, res) => {
  try {
    const mats = await prisma.material.findMany({
      include: { movimientos: { orderBy: { fecha: 'desc' }, take: 5 } },
      orderBy: { nombre: 'asc' }
    });
    res.json(mats.map(m => ({
      ...m,
      alertaNivel: m.stockActual <= 0              ? 'CRITICO'
                 : m.stockActual <= m.stockMinimo  ? 'BAJO'
                 : m.stockActual <= m.stockMinimo * 1.5 ? 'ATENCION' : 'OK'
    })));
  } catch { res.status(500).json({ error: 'Error al obtener materiales' }); }
});

router.post('/', auth, roles('ADMIN','GERENCIA','OBRA'), async (req, res) => {
  try {
    const m = await prisma.material.create({ data: req.body });
    res.status(201).json(m);
  } catch { res.status(500).json({ error: 'Error al crear material' }); }
});

router.put('/:id', auth, roles('ADMIN','GERENCIA','OBRA'), async (req, res) => {
  try {
    const m = await prisma.material.update({ where: { id: req.params.id }, data: req.body });
    res.json(m);
  } catch { res.status(500).json({ error: 'Error al actualizar material' }); }
});

module.exports = router;
