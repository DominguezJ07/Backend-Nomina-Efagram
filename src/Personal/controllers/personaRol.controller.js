const PersonaRol = require('../models/personaRol.model');
const Persona = require('../models/persona.model');
const Rol = require('../models/rol.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * @desc    Obtener todas las asignaciones persona-rol
 * @route   GET /api/v1/persona-roles
 * @access  Private (Admin, RRHH)
 */
const getPersonaRoles = asyncHandler(async (req, res) => {
  const { persona, rol, activo } = req.query;

  const filter = {};
  if (persona) filter.persona = persona;
  if (rol) filter.rol = rol;
  if (activo !== undefined) filter.activo = activo === 'true';

  const personaRoles = await PersonaRol.find(filter)
    .populate('persona')
    .populate('rol')
    .sort({ fecha_asignacion: -1 });

  res.status(200).json({
    success: true,
    count: personaRoles.length,
    data: personaRoles
  });
});

/**
 * @desc    Obtener roles de una persona
 * @route   GET /api/v1/persona-roles/persona/:personaId
 * @access  Private
 */
const getRolesByPersona = asyncHandler(async (req, res) => {
  const roles = await PersonaRol.getRolesByPersona(req.params.personaId);

  res.status(200).json({
    success: true,
    count: roles.length,
    data: roles
  });
});

/**
 * @desc    Asignar rol a persona
 * @route   POST /api/v1/persona-roles
 * @access  Private (Admin, RRHH)
 */
const asignarRol = asyncHandler(async (req, res) => {
  const { persona, rol, fecha_asignacion } = req.body;

  // Validar que la persona exista
  const personaExists = await Persona.findById(persona);
  if (!personaExists) {
    throw new ApiError(404, 'Persona no encontrada');
  }

  // Validar que el rol exista
  const rolExists = await Rol.findById(rol);
  if (!rolExists) {
    throw new ApiError(404, 'Rol no encontrado');
  }

  // Verificar que no tenga ya ese rol activo
  const yaAsignado = await PersonaRol.findOne({
    persona,
    rol,
    activo: true
  });

  if (yaAsignado) {
    throw new ApiError(409, 'La persona ya tiene ese rol asignado');
  }

  const personaRol = await PersonaRol.create({
    persona,
    rol,
    fecha_asignacion: fecha_asignacion || new Date()
  });

  await personaRol.populate(['persona', 'rol']);

  res.status(201).json({
    success: true,
    message: 'Rol asignado exitosamente',
    data: personaRol
  });
});

/**
 * @desc    Remover rol de persona
 * @route   DELETE /api/v1/persona-roles/:id
 * @access  Private (Admin, RRHH)
 */
const removerRol = asyncHandler(async (req, res) => {
  const personaRol = await PersonaRol.findById(req.params.id);

  if (!personaRol) {
    throw new ApiError(404, 'Asignación no encontrada');
  }

  personaRol.activo = false;
  personaRol.fecha_fin = new Date();
  await personaRol.save();

  res.status(200).json({
    success: true,
    message: 'Rol removido exitosamente',
    data: personaRol
  });
});

module.exports = {
  getPersonaRoles,
  getRolesByPersona,
  asignarRol,
  removerRol
};