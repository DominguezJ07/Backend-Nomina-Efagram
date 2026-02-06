const Zona = require('../models/zona.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * @desc    Obtener todas las zonas
 * @route   GET /api/v1/zonas
 * @access  Public
 */
const getZonas = asyncHandler(async (req, res) => {
  const { activa } = req.query;
  
  const filter = {};
  if (activa !== undefined) {
    filter.activa = activa === 'true';
  }

  const zonas = await Zona.find(filter).sort({ codigo: 1 });

  res.status(200).json({
    success: true,
    count: zonas.length,
    data: zonas
  });
});

/**
 * @desc    Obtener una zona por ID
 * @route   GET /api/v1/zonas/:id
 * @access  Public
 */
const getZona = asyncHandler(async (req, res) => {
  const zona = await Zona.findById(req.params.id).populate('nucleos');

  if (!zona) {
    throw new ApiError(404, 'Zona no encontrada');
  }

  res.status(200).json({
    success: true,
    data: zona
  });
});

/**
 * @desc    Obtener zona por código
 * @route   GET /api/v1/zonas/codigo/:codigo
 * @access  Public
 */
const getZonaByCodigo = asyncHandler(async (req, res) => {
  const zona = await Zona.findByCodigo(req.params.codigo);

  if (!zona) {
    throw new ApiError(404, 'Zona no encontrada');
  }

  res.status(200).json({
    success: true,
    data: zona
  });
});

/**
 * @desc    Crear una zona
 * @route   POST /api/v1/zonas
 * @access  Private (Admin)
 */
const createZona = asyncHandler(async (req, res) => {
  const zona = await Zona.create(req.body);

  res.status(201).json({
    success: true,
    message: 'Zona creada exitosamente',
    data: zona
  });
});

/**
 * @desc    Actualizar una zona
 * @route   PUT /api/v1/zonas/:id
 * @access  Private (Admin)
 */
const updateZona = asyncHandler(async (req, res) => {
  const zona = await Zona.findById(req.params.id);

  if (!zona) {
    throw new ApiError(404, 'Zona no encontrada');
  }

  // Verificar si el código está cambiando y si ya existe
  if (req.body.codigo && req.body.codigo.toUpperCase() !== zona.codigo) {
    const existeCodigo = await Zona.findOne({ 
      codigo: req.body.codigo.toUpperCase(),
      _id: { $ne: req.params.id }
    });
    
    if (existeCodigo) {
      throw new ApiError(409, 'El código ya está en uso por otra zona');
    }
  }

  // Verificar si el nombre está cambiando y si ya existe
  if (req.body.nombre && req.body.nombre !== zona.nombre) {
    const existeNombre = await Zona.findOne({ 
      nombre: req.body.nombre,
      _id: { $ne: req.params.id }
    });
    
    if (existeNombre) {
      throw new ApiError(409, 'El nombre ya está en uso por otra zona');
    }
  }

  // Actualizar solo los campos permitidos
  const camposPermitidos = ['nombre', 'codigo', 'descripcion', 'activa'];
  camposPermitidos.forEach(campo => {
    if (req.body[campo] !== undefined) {
      zona[campo] = req.body[campo];
    }
  });

  await zona.save();

  res.status(200).json({
    success: true,
    message: 'Zona actualizada exitosamente',
    data: zona
  });
});

/**
 * @desc    Eliminar una zona (soft delete)
 * @route   DELETE /api/v1/zonas/:id
 * @access  Private (Admin)
 */
const deleteZona = asyncHandler(async (req, res) => {
  const zona = await Zona.findById(req.params.id);

  if (!zona) {
    throw new ApiError(404, 'Zona no encontrada');
  }

  // Verificar si la zona ya está inactiva
  if (!zona.activa) {
    throw new ApiError(400, 'La zona ya está desactivada');
  }

  // Soft delete
  zona.activa = false;
  await zona.save();

  res.status(200).json({
    success: true,
    message: 'Zona desactivada exitosamente',
    data: zona
  });
});

/**
 * @desc    Obtener núcleos de una zona
 * @route   GET /api/v1/zonas/:id/nucleos
 * @access  Public
 */
const getNucleosByZona = asyncHandler(async (req, res) => {
  const zona = await Zona.findById(req.params.id).populate('nucleos');

  if (!zona) {
    throw new ApiError(404, 'Zona no encontrada');
  }

  res.status(200).json({
    success: true,
    count: zona.nucleos.length,
    data: zona.nucleos
  });
});

module.exports = {
  getZonas,
  getZona,
  getZonaByCodigo,
  createZona,
  updateZona,
  deleteZona,
  getNucleosByZona
};