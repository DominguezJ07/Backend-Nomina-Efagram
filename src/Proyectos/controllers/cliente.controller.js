const Cliente = require('../models/cliente.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * @desc    Obtener todos los clientes
 * @route   GET /api/v1/clientes
 * @access  Private
 */
const getClientes = asyncHandler(async (req, res) => {
  const { activo } = req.query;

  const filter = {};
  if (activo !== undefined) filter.activo = activo === 'true';

  const clientes = await Cliente.find(filter).sort({ razon_social: 1 });

  res.status(200).json({
    success: true,
    count: clientes.length,
    data: clientes
  });
});

/**
 * @desc    Obtener un cliente por ID
 * @route   GET /api/v1/clientes/:id
 * @access  Private
 */
const getCliente = asyncHandler(async (req, res) => {
  const cliente = await Cliente.findById(req.params.id).populate('proyectos');

  if (!cliente) {
    throw new ApiError(404, 'Cliente no encontrado');
  }

  res.status(200).json({
    success: true,
    data: cliente
  });
});

/**
 * @desc    Crear un cliente
 * @route   POST /api/v1/clientes
 * @access  Private (Admin, Jefe)
 */
const createCliente = asyncHandler(async (req, res) => {
  // Verificar que el NIT no exista
  const clienteExists = await Cliente.findOne({ nit: req.body.nit });
  if (clienteExists) {
    throw new ApiError(409, 'El NIT ya está registrado');
  }

  const cliente = await Cliente.create(req.body);

  res.status(201).json({
    success: true,
    message: 'Cliente creado exitosamente',
    data: cliente
  });
});

/**
 * @desc    Actualizar un cliente
 * @route   PUT /api/v1/clientes/:id
 * @access  Private (Admin, Jefe)
 */
const updateCliente = asyncHandler(async (req, res) => {
  let cliente = await Cliente.findById(req.params.id);

  if (!cliente) {
    throw new ApiError(404, 'Cliente no encontrado');
  }

  // Si se cambia el NIT, verificar que no exista
  if (req.body.nit && req.body.nit !== cliente.nit) {
    const nitExists = await Cliente.findOne({ nit: req.body.nit });
    if (nitExists) {
      throw new ApiError(409, 'El NIT ya está registrado');
    }
  }

  cliente = await Cliente.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Cliente actualizado exitosamente',
    data: cliente
  });
});

/**
 * @desc    Desactivar un cliente
 * @route   DELETE /api/v1/clientes/:id
 * @access  Private (Admin)
 */
const deleteCliente = asyncHandler(async (req, res) => {
  const cliente = await Cliente.findById(req.params.id);

  if (!cliente) {
    throw new ApiError(404, 'Cliente no encontrado');
  }

  cliente.activo = false;
  await cliente.save();

  res.status(200).json({
    success: true,
    message: 'Cliente desactivado exitosamente',
    data: cliente
  });
});

module.exports = {
  getClientes,
  getCliente,
  createCliente,
  updateCliente,
  deleteCliente
};
