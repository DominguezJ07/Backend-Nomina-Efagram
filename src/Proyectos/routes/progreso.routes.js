/**
 * progreso.routes.js
 * Ruta: src/Proyectos/routes/progreso.routes.js
 *
 * ✅ RUTAS UNIFICADAS DE PROGRESO
 */

const express = require('express');
const { validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate } = require('../../middlewares/authMiddleware');
const {
  getProgresoProyecto,
  getProgresoSubproyecto,
  getProgresoContrato,
} = require('../controllers/progreso.controller');

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/v1/progreso/proyecto/:proyectoId
 * Obtener progreso unificado de un Proyecto (con desglose de Subproyectos)
 */
router.get(
  '/proyecto/:proyectoId',
  validateMongoId('proyectoId'),
  getProgresoProyecto
);

/**
 * GET /api/v1/progreso/subproyecto/:subproyectoId
 * Obtener progreso unificado de un Subproyecto (con desglose de Contratos)
 */
router.get(
  '/subproyecto/:subproyectoId',
  validateMongoId('subproyectoId'),
  getProgresoSubproyecto
);

/**
 * GET /api/v1/progreso/contrato/:contratoId
 * Obtener progreso unificado de un Contrato (con desglose de Programaciones)
 */
router.get(
  '/contrato/:contratoId',
  validateMongoId('contratoId'),
  getProgresoContrato
);

module.exports = router;
