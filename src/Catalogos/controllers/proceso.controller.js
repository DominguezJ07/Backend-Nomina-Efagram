const Proceso = require('../models/proceso.model');
const Intervencion = require('../models/intervencion.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * @desc    Obtener todos los procesos
 * @route   GET /api/v1/procesos
 * @access  Private
 */
const getProcesos = asyncHandler(async (req, res) => {
  const { activo } = req.query;

  const filter = {};
  if (activo !== undefined) filter.activo = activo === 'true';

  const procesos = await Proceso.find(filter).sort({ nombre: 1 });

  res.status(200).json({
    success: true,
    count: procesos.length,
    data: procesos
  });
});

/**
 * @desc    Obtener un proceso por ID
 * @route   GET /api/v1/procesos/:id
 * @access  Private
 */
const getProceso = asyncHandler(async (req, res) => {
  const proceso = await Proceso.findById(req.params.id).populate('intervenciones');

  if (!proceso) {
    throw new ApiError(404, 'Proceso no encontrado');
  }

  res.status(200).json({
    success: true,
    data: proceso
  });
});

/**
 * @desc    Crear un proceso
 * @route   POST /api/v1/procesos
 * @access  Private (Admin, Jefe)
 */
const createProceso = asyncHandler(async (req, res) => {
  const codigoExiste = await Proceso.findOne({ codigo: req.body.codigo?.toUpperCase() });
  if (codigoExiste) {
    throw new ApiError(409, 'Ya existe un proceso con ese código');
  }

  const proceso = await Proceso.create(req.body);

  res.status(201).json({
    success: true,
    message: 'Proceso creado exitosamente',
    data: proceso
  });
});

/**
 * @desc    Actualizar un proceso
 * @route   PUT /api/v1/procesos/:id
 * @access  Private (Admin, Jefe)
 */
const updateProceso = asyncHandler(async (req, res) => {
  let proceso = await Proceso.findById(req.params.id);

  if (!proceso) {
    throw new ApiError(404, 'Proceso no encontrado');
  }

  // Si se cambia el código, verificar que no esté en uso
  if (req.body.codigo && req.body.codigo.toUpperCase() !== proceso.codigo) {
    const codigoExiste = await Proceso.findOne({ codigo: req.body.codigo.toUpperCase() });
    if (codigoExiste) {
      throw new ApiError(409, 'Ya existe un proceso con ese código');
    }
  }

  proceso = await Proceso.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    message: 'Proceso actualizado exitosamente',
    data: proceso
  });
});

/**
 * @desc    Desactivar un proceso
 * @route   DELETE /api/v1/procesos/:id
 * @access  Private (Admin)
 */
const deleteProceso = asyncHandler(async (req, res) => {
  const proceso = await Proceso.findById(req.params.id);

  if (!proceso) {
    throw new ApiError(404, 'Proceso no encontrado');
  }

  // Verificar que no tenga intervenciones activas asociadas
  const intervencionesActivas = await Intervencion.countDocuments({
    proceso: req.params.id,
    activo: true
  });

  if (intervencionesActivas > 0) {
    throw new ApiError(
      409,
      `No se puede desactivar: el proceso tiene ${intervencionesActivas} intervención(es) activa(s) asociada(s)`
    );
  }

  proceso.activo = false;
  await proceso.save();

  res.status(200).json({
    success: true,
    message: 'Proceso desactivado exitosamente',
    data: proceso
  });
});

module.exports = {
  getProcesos,
  getProceso,
  createProceso,
  updateProceso,
  deleteProceso
};