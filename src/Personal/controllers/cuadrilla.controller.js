const Cuadrilla = require('../models/cuadrilla.model');
const cuadrillaService = require('../services/cuadrilla.service');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * @desc    Obtener todas las cuadrillas
 * @route   GET /api/v1/cuadrillas
 * @access  Private
 */
const getCuadrillas = asyncHandler(async (req, res) => {
  const { activa, supervisor, nucleo } = req.query;

  const filter = {};
  if (activa !== undefined) filter.activa = activa === 'true';
  if (supervisor) filter.supervisor = supervisor;
  if (nucleo) filter.nucleo = nucleo;

  const cuadrillas = await Cuadrilla.find(filter)
    .populate('supervisor')
    .populate('nucleo')
    .populate('miembros.persona')
    .sort({ nombre: 1 });

  res.status(200).json({
    success: true,
    count: cuadrillas.length,
    data: cuadrillas
  });
});

/**
 * @desc    Obtener una cuadrilla por ID
 * @route   GET /api/v1/cuadrillas/:id
 * @access  Private
 */
const getCuadrilla = asyncHandler(async (req, res) => {
  const cuadrilla = await Cuadrilla.findById(req.params.id)
    .populate('supervisor')
    .populate('nucleo')
    .populate('miembros.persona');

  if (!cuadrilla) {
    throw new ApiError(404, 'Cuadrilla no encontrada');
  }

  res.status(200).json({
    success: true,
    data: cuadrilla
  });
});

/**
 * @desc    Crear una cuadrilla
 * @route   POST /api/v1/cuadrillas
 * @access  Private (Admin, Jefe Operaciones)
 */
const createCuadrilla = asyncHandler(async (req, res) => {
  // Validar que el supervisor exista
  await cuadrillaService.validateSupervisor(req.body.supervisor);

  // Transformar miembros de array de IDs a array de objetos
  let miembrosFormateados = [];
  if (req.body.miembros && Array.isArray(req.body.miembros)) {
    for (const miembroId of req.body.miembros) {
      await cuadrillaService.validatePersona(miembroId);
      miembrosFormateados.push({
        persona: miembroId,
        fecha_ingreso: new Date(),
        activo: true
      });
    }
  }

  // Crear datos de la cuadrilla con miembros formateados
  const cuadrillaData = {
    codigo: req.body.codigo,
    nombre: req.body.nombre,
    supervisor: req.body.supervisor,
    nucleo: req.body.nucleo,
    observaciones: req.body.observaciones,
    miembros: miembrosFormateados
  };

  const cuadrilla = await Cuadrilla.create(cuadrillaData);
  await cuadrilla.populate('supervisor');
  await cuadrilla.populate('nucleo');
  await cuadrilla.populate('miembros.persona');

  res.status(201).json({
    success: true,
    message: 'Cuadrilla creada exitosamente',
    data: cuadrilla
  });
});

/**
 * @desc    Actualizar una cuadrilla
 * @route   PUT /api/v1/cuadrillas/:id
 * @access  Private (Admin, Jefe Operaciones)
 */
const updateCuadrilla = asyncHandler(async (req, res) => {
  const cuadrilla = await cuadrillaService.validateCuadrillaExists(req.params.id);

  // Si se cambia el supervisor, validar que exista
  if (req.body.supervisor && req.body.supervisor !== cuadrilla.supervisor.toString()) {
    await cuadrillaService.validateSupervisor(req.body.supervisor);
  }

  // Verificar si el código está cambiando y si ya existe
  if (req.body.codigo && req.body.codigo !== cuadrilla.codigo) {
    const existeCodigo = await Cuadrilla.findOne({ 
      codigo: req.body.codigo,
      _id: { $ne: req.params.id }
    });
    
    if (existeCodigo) {
      throw new ApiError(409, 'El código de cuadrilla ya existe');
    }
  }

  // Actualizar solo los campos permitidos (sin miembros)
  const camposPermitidos = ['codigo', 'nombre', 'supervisor', 'nucleo', 'activa', 'observaciones'];
  camposPermitidos.forEach(campo => {
    if (req.body[campo] !== undefined) {
      cuadrilla[campo] = req.body[campo];
    }
  });

  await cuadrilla.save();
  await cuadrilla.populate('supervisor');
  await cuadrilla.populate('nucleo');
  await cuadrilla.populate('miembros.persona');

  res.status(200).json({
    success: true,
    message: 'Cuadrilla actualizada exitosamente',
    data: cuadrilla
  });
});

/**
 * @desc    Agregar miembros a una cuadrilla
 * @route   POST /api/v1/cuadrillas/:id/miembros
 * @access  Private (Admin, Jefe Operaciones, Supervisor)
 */
const agregarMiembros = asyncHandler(async (req, res) => {
  const { personalId } = req.body;

  if (!personalId) {
    throw new ApiError(400, 'Debe proporcionar el ID de la persona');
  }

  // Convertir a array si es un solo ID
  const personasArray = Array.isArray(personalId) ? personalId : [personalId];

  const cuadrilla = await cuadrillaService.agregarMiembros(req.params.id, personasArray);

  res.status(200).json({
    success: true,
    message: 'Miembro(s) agregado(s) exitosamente',
    data: cuadrilla
  });
});

/**
 * @desc    Remover miembro de una cuadrilla
 * @route   DELETE /api/v1/cuadrillas/:id/miembros/:personaId
 * @access  Private (Admin, Jefe Operaciones, Supervisor)
 */
const removerMiembro = asyncHandler(async (req, res) => {
  const cuadrilla = await cuadrillaService.validateCuadrillaExists(req.params.id);
  await cuadrilla.removerMiembro(req.params.personaId);
  await cuadrilla.populate('miembros.persona');

  res.status(200).json({
    success: true,
    message: 'Miembro removido exitosamente',
    data: cuadrilla
  });
});

/**
 * @desc    Desactivar una cuadrilla
 * @route   DELETE /api/v1/cuadrillas/:id
 * @access  Private (Admin, Jefe Operaciones)
 */
const deleteCuadrilla = asyncHandler(async (req, res) => {
  const cuadrilla = await cuadrillaService.validateCuadrillaExists(req.params.id);

  if (!cuadrilla.activa) {
    throw new ApiError(400, 'La cuadrilla ya está desactivada');
  }

  cuadrilla.activa = false;
  await cuadrilla.save();

  res.status(200).json({
    success: true,
    message: 'Cuadrilla desactivada exitosamente',
    data: cuadrilla
  });
});

module.exports = {
  getCuadrillas,
  getCuadrilla,
  createCuadrilla,
  updateCuadrilla,
  agregarMiembros,
  removerMiembro,
  deleteCuadrilla
};