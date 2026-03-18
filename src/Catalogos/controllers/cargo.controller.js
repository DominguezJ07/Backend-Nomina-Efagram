const Cargo = require('../models/cargo.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * @desc    Obtener todos los cargos
 * @route   GET /api/v1/cargos
 * @access  Private
 */
const getCargos = asyncHandler(async (req, res) => {
  const { activo } = req.query;

  const filter = {};
  if (activo !== undefined) filter.activo = activo === 'true';

  const cargos = await Cargo.find(filter).sort({ nombre: 1 });

  res.status(200).json({
    success: true,
    count: cargos.length,
    data: cargos
  });
});

/**
 * @desc    Obtener un cargo por ID
 * @route   GET /api/v1/cargos/:id
 * @access  Private
 */
const getCargo = asyncHandler(async (req, res) => {
  const cargo = await Cargo.findById(req.params.id);

  if (!cargo) {
    throw new ApiError(404, 'Cargo no encontrado');
  }

  res.status(200).json({
    success: true,
    data: cargo
  });
});

/**
 * @desc    Crear un cargo
 * @route   POST /api/v1/cargos
 * @access  Private (Admin, Jefe)
 */
const createCargo = asyncHandler(async (req, res) => {
  const codigoExiste = await Cargo.findOne({ codigo: req.body.codigo });
  if (codigoExiste) {
    throw new ApiError(409, 'Ya existe un cargo con ese código');
  }

  const cargo = await Cargo.create(req.body);

  res.status(201).json({
    success: true,
    message: 'Cargo creado exitosamente',
    data: cargo
  });
});

/**
 * @desc    Actualizar un cargo
 * @route   PUT /api/v1/cargos/:id
 * @access  Private (Admin, Jefe)
 */
const updateCargo = asyncHandler(async (req, res) => {
  let cargo = await Cargo.findById(req.params.id);

  if (!cargo) {
    throw new ApiError(404, 'Cargo no encontrado');
  }

  // Si se cambia el código, verificar que no esté en uso
  if (req.body.codigo !== undefined && req.body.codigo !== cargo.codigo) {
    const codigoExiste = await Cargo.findOne({ codigo: req.body.codigo });
    if (codigoExiste) {
      throw new ApiError(409, 'Ya existe un cargo con ese código');
    }
  }

  cargo = await Cargo.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    message: 'Cargo actualizado exitosamente',
    data: cargo
  });
});

/**
 * @desc    Desactivar un cargo
 * @route   DELETE /api/v1/cargos/:id
 * @access  Private (Admin)
 */
const deleteCargo = asyncHandler(async (req, res) => {
  const cargo = await Cargo.findById(req.params.id);

  if (!cargo) {
    throw new ApiError(404, 'Cargo no encontrado');
  }

  cargo.activo = false;
  await cargo.save();

  res.status(200).json({
    success: true,
    message: 'Cargo desactivado exitosamente',
    data: cargo
  });
});

module.exports = {
  getCargos,
  getCargo,
  createCargo,
  updateCargo,
  deleteCargo
};