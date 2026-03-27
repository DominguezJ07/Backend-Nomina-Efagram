const express = require('express');
const router = express.Router();

const {
  createActividad,
  getByIntervencion
} = require('../controllers/actividadCatalogo.controller');

// 🔥 CREAR
router.post('/', createActividad);

// 🔥 FILTRAR POR INTERVENCIÓN
router.get('/intervencion/:intervencionId', getByIntervencion);

module.exports = router;