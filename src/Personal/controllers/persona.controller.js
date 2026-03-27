const Persona = require('../models/persona.model');
const personaService = require('../services/persona.service');
const personaBulkService = require('../services/personaBulk.service');
const Finca = require('../../Territorial/models/finca.model');
const Proceso = require('../../Catalogos/models/proceso.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * @desc    Obtener listado de personas
 * @route   GET /api/v1/personas
 * @access  Private
 */
const getPersonas = asyncHandler(async (req, res) => {
  const filters = req.query;
  const personas = await personaService.getPersonas(filters);

  res.status(200).json({
    success: true,
    count: personas.length,
    data: personas
  });
});

/**
 * @desc    Obtener una persona por ID
 * @route   GET /api/v1/personas/:id
 * @access  Private
 */
const getPersona = asyncHandler(async (req, res) => {
  const persona = await personaService.getPersonaById(req.params.id);

  if (!persona) {
    throw new ApiError(404, 'Persona no encontrada');
  }

  res.status(200).json({
    success: true,
    data: persona
  });
});

/**
 * @desc    Crear persona
 * @route   POST /api/v1/personas
 * @access  Private
 */
const createPersona = asyncHandler(async (req, res) => {
  const persona = await personaService.createPersona(req.body);

  res.status(201).json({
    success: true,
    message: 'Persona creada exitosamente',
    data: persona
  });
});

/**
 * @desc    Actualizar persona
 * @route   PUT /api/v1/personas/:id
 * @access  Private
 */
const updatePersona = asyncHandler(async (req, res) => {
  const persona = await personaService.updatePersona(req.params.id, req.body);

  res.status(200).json({
    success: true,
    message: 'Persona actualizada exitosamente',
    data: persona
  });
});

/**
 * @desc    Retirar persona
 * @route   POST /api/v1/personas/:id/retirar
 * @access  Private
 */
const retirarPersona = asyncHandler(async (req, res) => {
  const persona = await personaService.retirarPersona(req.params.id, req.body.motivo);

  res.status(200).json({
    success: true,
    message: 'Persona retirada exitosamente',
    data: persona
  });
});

/**
 * @desc    Vincular persona con usuario
 * @route   POST /api/v1/personas/:id/vincular-usuario
 * @access  Private
 */
const vincularUsuario = asyncHandler(async (req, res) => {
  const persona = await personaService.vincularUsuario(req.params.id, req.body.usuarioId);

  res.status(200).json({
    success: true,
    message: 'Usuario vinculado exitosamente',
    data: persona
  });
});

/**
 * @desc    Buscar personas
 * @route   GET /api/v1/personas/buscar
 * @access  Private
 */
const buscarPersonas = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || !q.trim()) {
    throw new ApiError(400, 'Debes proporcionar un término de búsqueda');
  }

  const personas = await personaService.buscarPersonas(q.trim());

  res.status(200).json({
    success: true,
    count: personas.length,
    data: personas
  });
});

/**
 * @desc    Obtener data para plantilla de carga masiva de personal
 * @route   GET /api/v1/personas/bulk/template-data
 * @access  Private
 */
const getPersonasBulkTemplateData = asyncHandler(async (_req, res) => {
  const [personas, fincas, procesos, supervisores] = await Promise.all([
    Persona.find({})
      .populate('finca', 'nombre codigo')
      .populate('proceso', 'nombre codigo')
      .populate('supervisor', 'nombres apellidos num_doc')
      .sort({ apellidos: 1 })
      .lean(),
    Finca.find({ activa: true }).sort({ nombre: 1 }).lean(),
    Proceso.find({ activo: true }).sort({ nombre: 1 }).lean(),
    Persona.find({ estado: 'ACTIVO' })
      .select('nombres apellidos num_doc cargo')
      .sort({ apellidos: 1 })
      .lean(),
  ]);

  res.status(200).json({
    success: true,
    data: {
      personas,
      fincas,
      procesos,
      supervisores,
    }
  });
});

/**
 * @desc    Procesar carga masiva de personal
 * @route   POST /api/v1/personas/bulk/upsert
 * @access  Private
 */
const bulkUpsertPersonas = asyncHandler(async (req, res) => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];

  if (!rows.length) {
    throw new ApiError(400, 'Debes enviar al menos una fila para procesar');
  }

  const result = await personaBulkService.processRows(rows);

  res.status(200).json({
    success: true,
    message: 'Carga masiva de personal procesada',
    data: result
  });
});

module.exports = {
  getPersonas,
  getPersona,
  createPersona,
  updatePersona,
  retirarPersona,
  vincularUsuario,
  buscarPersonas,
  getPersonasBulkTemplateData,
  bulkUpsertPersonas
};