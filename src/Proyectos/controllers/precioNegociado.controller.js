const PrecioNegociado = require('../models/precioNegociado.model');
const Persona = require('../../Personal/models/persona.model');
const palService = require('../services/pal.service');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * @desc    Obtener todos los precios negociados
 * @route   GET /api/v1/precios-negociados
 * @access  Private
 */
const getPreciosNegociados = asyncHandler(async (req, res) => {
  const { pal, activo } = req.query;

  const filter = {};
  if (pal) filter.proyecto_actividad_lote = pal;
  if (activo !== undefined) filter.activo = activo === 'true';

  const precios = await PrecioNegociado.find(filter)
    .populate('proyecto_actividad_lote')
    .populate('negociado_por')
    .populate('autorizado_por')
    .sort({ version: -1 });

  res.status(200).json({
    success: true,
    count: precios.length,
    data: precios
  });
});

/**
 * @desc    Obtener historial de precios de un PAL
 * @route   GET /api/v1/precios-negociados/historial/:palId
 * @access  Private
 */
const getHistorialPrecios = asyncHandler(async (req, res) => {
  const precios = await PrecioNegociado.find({
    proyecto_actividad_lote: req.params.palId
  })
    .populate('negociado_por')
    .populate('autorizado_por')
    .sort({ version: -1 });

  res.status(200).json({
    success: true,
    count: precios.length,
    data: precios
  });
});

/**
 * @desc    Crear/Negociar un precio
 * @route   POST /api/v1/precios-negociados
 * @access  Private (Admin, Jefe, Supervisor)
 */
const createPrecioNegociado = asyncHandler(async (req, res) => {
  console.log('=== INICIO CREATE PRECIO NEGOCIADO ===');
  console.log('Body recibido:', req.body);
  console.log('Usuario autenticado:', req.user);

  // 1. Validar que el PAL exista
  console.log('Validando PAL...');
  await palService.validatePALExists(req.body.proyecto_actividad_lote);
  console.log('PAL validado correctamente');

  // 2. Si no viene negociado_por, buscar persona del usuario autenticado
  if (!req.body.negociado_por) {
    console.log('negociado_por no proporcionado, buscando persona del usuario...');
    
    if (!req.user) {
      throw new ApiError(401, 'Usuario no autenticado');
    }

    console.log('Buscando persona con usuario:', req.user.id);
    let persona = await Persona.findOne({ usuario: req.user.id });
    console.log('Persona encontrada:', persona);
    
    // Si no hay persona asociada, buscar alternativas
    if (!persona) {
      console.log('No hay persona asociada al usuario, buscando alternativas...');
      
      // Opción 1: Buscar cualquier persona con rol de supervisor/jefe
      persona = await Persona.findOne({ 
        cargo: { $in: ['Supervisor de Campo', 'Jefe de Operaciones'] } 
      });
      
      // Opción 2: Si no hay supervisores, usar la primera persona disponible
      if (!persona) {
        persona = await Persona.findOne();
      }
      
      if (!persona) {
        throw new ApiError(
          400,
          'No se encontró una persona vinculada a este usuario y no hay personas en el sistema. Por favor, proporcione el campo negociado_por en el body de la petición.'
        );
      }
      
      console.log('Usando persona alternativa:', persona);
    }
    
    req.body.negociado_por = persona._id;
    console.log('negociado_por asignado:', req.body.negociado_por);
  } else {
    // Verificar que la persona especificada existe
    const personaExiste = await Persona.findById(req.body.negociado_por);
    if (!personaExiste) {
      throw new ApiError(404, 'La persona especificada como negociador no existe');
    }
  }

  // 3. Si viene autorizado_por, verificar que existe
  if (req.body.autorizado_por) {
    const autorizadorExiste = await Persona.findById(req.body.autorizado_por);
    if (!autorizadorExiste) {
      throw new ApiError(404, 'La persona especificada como autorizador no existe');
    }
  }

  // 4. Crear el precio negociado
  console.log('Creando precio negociado con datos:', req.body);
  const precio = await PrecioNegociado.create(req.body);
  console.log('Precio creado:', precio);

  // 5. Poblar referencias
  console.log('Poblando referencias...');
  await precio.populate([
    'proyecto_actividad_lote',
    'negociado_por',
    'autorizado_por'
  ]);
  console.log('Referencias pobladas correctamente');

  console.log('=== FIN CREATE PRECIO NEGOCIADO ===');

  res.status(201).json({
    success: true,
    message: 'Precio negociado exitosamente',
    data: precio
  });
});

module.exports = {
  getPreciosNegociados,
  getHistorialPrecios,
  createPrecioNegociado
};