const Persona = require('../models/persona.model');
const PersonaRol = require('../models/personaRol.model');
const Rol = require('../models/rol.model');
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

/**
 * @desc    Obtener todos los supervisores activos
 * @route   GET /api/v1/personas/supervisores
 * @access  Private
 *
 * Lógica:
 * 1. Busca el Rol con codigo = 'SUPERVISOR'
 * 2. Obtiene los PersonaRol activos con ese rol
 * 3. Devuelve las Personas correspondientes (con estado ACTIVO)
 * 4. Soporta query param ?incluir_inactivos=true para traer todos
 */
const getSupervisores = asyncHandler(async (req, res) => {
  const { incluir_inactivos } = req.query;

  // 1. Encontrar el rol SUPERVISOR en la colección de Roles
  const rolSupervisor = await Rol.findOne({ codigo: 'SUPERVISOR' });

  if (!rolSupervisor) {
    // Si no existe el rol todavía, devolver array vacío en lugar de 500
    return res.status(200).json({
      success: true,
      count: 0,
      data: [],
      mensaje: 'El rol SUPERVISOR no está configurado en el sistema'
    });
  }

  // 2. Obtener todas las asignaciones activas de ese rol
  const asignaciones = await PersonaRol.find({
    rol: rolSupervisor._id,
    activo: true
  }).select('persona');

  const personaIds = asignaciones.map(a => a.persona);

  // 3. Construir filtro de personas
  const filtroPersona = { _id: { $in: personaIds } };

  // Por defecto solo ACTIVOS, a menos que pidan incluir inactivos
  if (incluir_inactivos !== 'true') {
    filtroPersona.estado = 'ACTIVO';
  }

  // 4. Obtener los datos completos de cada supervisor
  const supervisores = await Persona.find(filtroPersona)
    .populate('usuario', 'email')
    .sort({ apellidos: 1, nombres: 1 });

  res.status(200).json({
    success: true,
    count: supervisores.length,
    data: supervisores
  });
});

/**
 * @desc    Obtener todas las personas con un rol específico
 * @route   GET /api/v1/personas/por-rol/:codigoRol
 * @access  Private
 *
 * Útil para: TRABAJADOR, ADMIN_FINCA, JEFE_OPERACIONES, etc.
 * Ejemplo: GET /api/v1/personas/por-rol/TRABAJADOR
 */
const getPersonasPorRol = asyncHandler(async (req, res) => {
  const { codigoRol } = req.params;
  const { incluir_inactivos } = req.query;

  // 1. Buscar el rol por código (case-insensitive)
  const rol = await Rol.findOne({ codigo: codigoRol.toUpperCase().trim() });

  if (!rol) {
    throw new ApiError(404, `El rol '${codigoRol}' no existe en el sistema`);
  }

  // 2. Asignaciones activas con ese rol
  const asignaciones = await PersonaRol.find({
    rol: rol._id,
    activo: true
  }).select('persona');

  const personaIds = asignaciones.map(a => a.persona);

  // 3. Filtro de personas
  const filtroPersona = { _id: { $in: personaIds } };
  if (incluir_inactivos !== 'true') {
    filtroPersona.estado = 'ACTIVO';
  }

  const personas = await Persona.find(filtroPersona)
    .populate('usuario', 'email')
    .sort({ apellidos: 1, nombres: 1 });

  res.status(200).json({
    success: true,
    rol: { id: rol._id, codigo: rol.codigo, nombre: rol.nombre },
    count: personas.length,
    data: personas
  });
});

module.exports = {
  getPersonas,
  getPersona,
  createPersona,
  updatePersona,
  retirarPersona,
  vincularUsuario,
  getSupervisores,
  getPersonasPorRol
};