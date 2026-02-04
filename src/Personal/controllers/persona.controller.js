const Persona = require('../models/persona.model');
const personaService = require('../services/persona.service');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * @desc    Obtener todas las personas
 * @route   GET /api/v1/personas
 * @access  Private
 */
const getPersonas = asyncHandler(async (req, res) => {
  const { estado, cargo } = req.query;

  const filter = {};
  if (estado) filter.estado = estado;
  if (cargo) filter.cargo = cargo;

  const personas = await Persona.find(filter)
    .populate('usuario', 'email roles')
    .sort({ apellidos: 1 });

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
  const persona = await Persona.findById(req.params.id).populate('usuario');

  if (!persona) {
    throw new ApiError(404, 'Persona no encontrada');
  }

  res.status(200).json({
    success: true,
    data: persona
  });
});

/**
 * @desc    Crear una persona
 * @route   POST /api/v1/personas
 * @access  Private (Admin, RRHH)
 */
const createPersona = asyncHandler(async (req, res) => {
  // Validar documento único
  await personaService.validateDocumentoUnico(req.body.num_doc);

  const persona = await Persona.create(req.body);

  res.status(201).json({
    success: true,
    message: 'Persona creada exitosamente',
    data: persona
  });
});

/**
 * @desc    Actualizar una persona
 * @route   PUT /api/v1/personas/:id
 * @access  Private (Admin, RRHH)
 */
const updatePersona = asyncHandler(async (req, res) => {
  let persona = await personaService.validatePersonaExists(req.params.id);

  // Si se cambia el documento, validar que sea único
  if (req.body.num_doc && req.body.num_doc !== persona.num_doc) {
    await personaService.validateDocumentoUnico(req.body.num_doc, req.params.id);
  }

  persona = await Persona.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('usuario');

  res.status(200).json({
    success: true,
    message: 'Persona actualizada exitosamente',
    data: persona
  });
});

/**
 * @desc    Retirar una persona
 * @route   POST /api/v1/personas/:id/retirar
 * @access  Private (Admin, RRHH)
 */
const retirarPersona = asyncHandler(async (req, res) => {
  const { motivo } = req.body;

  if (!motivo) {
    throw new ApiError(400, 'El motivo de retiro es obligatorio');
  }

  const persona = await personaService.retirarPersona(req.params.id, motivo);

  res.status(200).json({
    success: true,
    message: 'Persona retirada exitosamente',
    data: persona
  });
});

/**
 * @desc    Vincular persona con usuario
 * @route   POST /api/v1/personas/:id/vincular-usuario
 * @access  Private (Admin)
 */
const vincularUsuario = asyncHandler(async (req, res) => {
  const { usuarioId } = req.body;

  if (!usuarioId) {
    throw new ApiError(400, 'El ID del usuario es obligatorio');
  }

  const persona = await personaService.vincularUsuario(req.params.id, usuarioId);

  res.status(200).json({
    success: true,
    message: 'Usuario vinculado exitosamente',
    data: persona
  });
});

module.exports = {
  getPersonas,
  getPersona,
  createPersona,
  updatePersona,
  retirarPersona,
  vincularUsuario
};