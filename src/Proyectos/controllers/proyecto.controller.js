const Proyecto = require('../models/proyecto.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');
const mongoose = require('mongoose');

// ====================================================================
// FUNCIONES EXISTENTES (NO MODIFICAR)
// ====================================================================

/**
 * @desc    Obtener todos los proyectos
 * @route   GET /api/v1/proyectos
 * @access  Private
 */
const getProyectos = asyncHandler(async (req, res) => {
  const { estado, cliente } = req.query;
  
  const filter = {};
  if (estado) filter.estado = estado;
  if (cliente) filter.cliente = cliente;
  
  const proyectos = await Proyecto.find(filter)
    .populate('cliente')
    .populate('responsable')
    .sort({ createdAt: -1 });
  
  res.status(200).json({
    success: true,
    count: proyectos.length,
    data: proyectos
  });
});

/**
 * @desc    Obtener un proyecto por ID
 * @route   GET /api/v1/proyectos/:id
 * @access  Private
 */
const getProyecto = asyncHandler(async (req, res) => {
  const proyecto = await Proyecto.findById(req.params.id)
    .populate('cliente')
    .populate('responsable');
  
  if (!proyecto) {
    throw new ApiError(404, 'Proyecto no encontrado');
  }
  
  res.status(200).json({
    success: true,
    data: proyecto
  });
});

/**
 * @desc    Obtener resumen de un proyecto
 * @route   GET /api/v1/proyectos/:id/resumen
 * @access  Private
 */
const getResumenProyecto = asyncHandler(async (req, res) => {
  const proyecto = await Proyecto.findById(req.params.id);
  
  if (!proyecto) {
    throw new ApiError(404, 'Proyecto no encontrado');
  }
  
  // Aquí puedes agregar lógica adicional para el resumen
  res.status(200).json({
    success: true,
    data: proyecto
  });
});

/**
 * @desc    Crear un nuevo proyecto
 * @route   POST /api/v1/proyectos
 * @access  Private (Admin, Jefe)
 */
const createProyecto = asyncHandler(async (req, res) => {
  const {
    codigo,
    nombre,
    cliente,
    responsable,
    fecha_inicio,
    fecha_fin_estimada,
    tipo_contrato,
    descripcion,
    avance,
    actividades_por_intervencion
  } = req.body;

  // =========================
  // VALIDACIONES FUERTES
  // =========================
  if (!codigo || !codigo.trim()) {
    throw new ApiError(400, 'El código es obligatorio');
  }

  if (!nombre || !nombre.trim()) {
    throw new ApiError(400, 'El nombre es obligatorio');
  }

  if (!cliente || !mongoose.Types.ObjectId.isValid(cliente)) {
    throw new ApiError(400, 'El cliente es inválido');
  }

  if (!fecha_inicio) {
    throw new ApiError(400, 'La fecha de inicio es obligatoria');
  }

  // =========================
  // Normalizar actividades
  // =========================
  const actividadesNormalizadas = {
    mantenimiento: actividades_por_intervencion?.mantenimiento || [],
    no_programadas: actividades_por_intervencion?.no_programadas || [],
    establecimiento: actividades_por_intervencion?.establecimiento || [],
  };

  // Validar estructura de actividades
  Object.keys(actividadesNormalizadas).forEach((tipo) => {
    actividadesNormalizadas[tipo] = actividadesNormalizadas[tipo].map((act) => ({
      nombre: act.nombre?.trim() || '',
      precio_unitario: Number(act.precio_unitario) || 0,
      cantidad: Number(act.cantidad) || 0,
      unidad: act.unidad || 'hectareas',
      estado: act.estado || 'Pendiente',
    }));
  });

  // =========================
  // Crear proyecto
  // =========================
  const proyecto = await Proyecto.create({
    codigo: codigo.trim().toUpperCase(),
    nombre: nombre.trim(),
    cliente,
    responsable: responsable || null,
    fecha_inicio,
    fecha_fin_estimada: fecha_fin_estimada || null,
    tipo_contrato,
    descripcion,
    avance: Number(avance) || 0,
    actividades_por_intervencion: actividadesNormalizadas,
  });

  await proyecto.populate(['cliente', 'responsable']);

  res.status(201).json({
    success: true,
    message: 'Proyecto creado exitosamente',
    data: proyecto
  });
});


/**
 * @desc    Actualizar un proyecto
 * @route   PUT /api/v1/proyectos/:id
 * @access  Private (Admin, Jefe)
 */
const updateProyecto = asyncHandler(async (req, res) => {
  const proyecto = await Proyecto.findById(req.params.id);

  if (!proyecto) {
    throw new ApiError(404, 'Proyecto no encontrado');
  }

  // Actualizar campos simples
  Object.assign(proyecto, req.body);

  // Si vienen actividades nuevas
  if (req.body.actividades_por_intervencion) {
    proyecto.actividades_por_intervencion = {
      mantenimiento: req.body.actividades_por_intervencion.mantenimiento || [],
      no_programadas: req.body.actividades_por_intervencion.no_programadas || [],
      establecimiento: req.body.actividades_por_intervencion.establecimiento || [],
    };
  }

  await proyecto.save();
  await proyecto.populate(['cliente', 'responsable']);

  res.status(200).json({
    success: true,
    message: 'Proyecto actualizado exitosamente',
    data: proyecto
  });
});


/**
 * @desc    Eliminar un proyecto
 * @route   DELETE /api/v1/proyectos/:id
 * @access  Private (Solo Admin)
 */
const deleteProyecto = asyncHandler(async (req, res) => {
  const proyecto = await Proyecto.findById(req.params.id);
  
  if (!proyecto) {
    throw new ApiError(404, 'Proyecto no encontrado');
  }
  
  // Validar que el proyecto no tenga actividades asociadas
  const PAL = require('../models/proyectoActividadLote.model');
  const tieneActividades = await PAL.countDocuments({ proyecto: req.params.id });
  
  if (tieneActividades > 0) {
    throw new ApiError(
      400, 
      `No se puede eliminar el proyecto. Tiene ${tieneActividades} actividades asociadas.`
    );
  }
  
  await proyecto.deleteOne();
  
  res.status(200).json({
    success: true,
    message: 'Proyecto eliminado exitosamente',
    data: {}
  });
});

/**
 * @desc    Cerrar un proyecto
 * @route   POST /api/v1/proyectos/:id/cerrar
 * @access  Private (Admin, Jefe)
 */
const cerrarProyecto = asyncHandler(async (req, res) => {
  const proyecto = await Proyecto.findById(req.params.id);
  
  if (!proyecto) {
    throw new ApiError(404, 'Proyecto no encontrado');
  }
  
  proyecto.estado = 'CERRADO';
  proyecto.fecha_fin_real = new Date();
  await proyecto.save();
  
  res.status(200).json({
    success: true,
    message: 'Proyecto cerrado exitosamente',
    data: proyecto
  });
});

/**
 * @desc    Verificar si un proyecto puede cerrarse
 * @route   GET /api/v1/proyectos/:id/puede-cerrar
 * @access  Private
 */
const puedeObtenerProyecto = asyncHandler(async (req, res) => {
  const proyecto = await Proyecto.findById(req.params.id);
  
  if (!proyecto) {
    throw new ApiError(404, 'Proyecto no encontrado');
  }
  
  res.status(200).json({
    success: true,
    puede_cerrar: true,
    data: proyecto
  });
});

// ====================================================================
// NUEVAS FUNCIONES DE PRESUPUESTO ANUAL
// ====================================================================

/**
 * @desc    Actualizar presupuesto anual del proyecto
 * @route   PUT /api/v1/proyectos/:id/presupuesto-anual
 * @access  Private (Solo ADMIN_SISTEMA)
 */
const actualizarPresupuestoAnual = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    cantidad_actividades_planeadas,
    monto_presupuestado,
    año_fiscal,
    observaciones_presupuesto,
    presupuesto_por_intervencion
  } = req.body;

  // Validar que el proyecto exista
  const proyecto = await Proyecto.findById(id);
  if (!proyecto) {
    throw new ApiError(404, 'Proyecto no encontrado');
  }

  // Validar año fiscal
  if (!año_fiscal || año_fiscal < 2020 || año_fiscal > 2100) {
    throw new ApiError(400, 'El año fiscal es inválido');
  }

  // Validar que cantidad y monto sean positivos
  if (cantidad_actividades_planeadas < 0) {
    throw new ApiError(400, 'La cantidad de actividades no puede ser negativa');
  }
  if (monto_presupuestado < 0) {
    throw new ApiError(400, 'El monto presupuestado no puede ser negativo');
  }

  // Validar desglose por intervención (opcional)
  if (presupuesto_por_intervencion) {
    const totalActividades = 
      (presupuesto_por_intervencion.mantenimiento?.cantidad_actividades || 0) +
      (presupuesto_por_intervencion.no_programadas?.cantidad_actividades || 0) +
      (presupuesto_por_intervencion.establecimiento?.cantidad_actividades || 0);
    
    const totalPresupuesto = 
      (presupuesto_por_intervencion.mantenimiento?.monto_presupuestado || 0) +
      (presupuesto_por_intervencion.no_programadas?.monto_presupuestado || 0) +
      (presupuesto_por_intervencion.establecimiento?.monto_presupuestado || 0);
    
    // Validar que el desglose no exceda el total
    if (totalActividades > cantidad_actividades_planeadas) {
      throw new ApiError(
        400, 
        `El total de actividades por intervención (${totalActividades}) excede el total planeado (${cantidad_actividades_planeadas})`
      );
    }
    
    if (totalPresupuesto > monto_presupuestado) {
      throw new ApiError(
        400, 
        `El total de presupuesto por intervención ($${totalPresupuesto}) excede el total planeado ($${monto_presupuestado})`
      );
    }
  }

  // Buscar la persona asociada al usuario (para aprobado_por)
const Persona = require('../../Personal/models/persona.model');
let persona = await Persona.findOne({ usuario: req.user.id });

// Si no hay persona asociada, usar la primera disponible
if (!persona) {
  persona = await Persona.findOne();
  if (!persona) {
    throw new ApiError(
      400, 
      'No hay personas registradas en el sistema. Contacta al administrador.'
    );
  }
}

  // Actualizar presupuesto anual
  proyecto.presupuesto_anual = {
    cantidad_actividades_planeadas: cantidad_actividades_planeadas || 0,
    monto_presupuestado: monto_presupuestado || 0,
    año_fiscal,
    fecha_aprobacion: new Date(),
    aprobado_por: persona._id,
    observaciones_presupuesto
  };

  // Si viene desglose por intervención, actualizarlo
  if (presupuesto_por_intervencion) {
    proyecto.presupuesto_por_intervencion = {
      mantenimiento: {
        cantidad_actividades: presupuesto_por_intervencion.mantenimiento?.cantidad_actividades || 0,
        monto_presupuestado: presupuesto_por_intervencion.mantenimiento?.monto_presupuestado || 0
      },
      no_programadas: {
        cantidad_actividades: presupuesto_por_intervencion.no_programadas?.cantidad_actividades || 0,
        monto_presupuestado: presupuesto_por_intervencion.no_programadas?.monto_presupuestado || 0
      },
      establecimiento: {
        cantidad_actividades: presupuesto_por_intervencion.establecimiento?.cantidad_actividades || 0,
        monto_presupuestado: presupuesto_por_intervencion.establecimiento?.monto_presupuestado || 0
      }
    };
  }

  await proyecto.save();

  // Poblar aprobado_por
  await proyecto.populate('presupuesto_anual.aprobado_por');

  res.status(200).json({
    success: true,
    message: 'Presupuesto anual actualizado correctamente',
    data: proyecto
  });
});

/**
 * @desc    Obtener presupuesto anual del proyecto con métricas
 * @route   GET /api/v1/proyectos/:id/presupuesto-anual
 * @access  Private
 */
const obtenerPresupuestoAnual = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const proyecto = await Proyecto.findById(id)
    .populate('presupuesto_anual.aprobado_por');

  if (!proyecto) {
    throw new ApiError(404, 'Proyecto no encontrado');
  }

  // Si no tiene presupuesto configurado, devolver estructura vacía
  if (!proyecto.presupuesto_anual || !proyecto.presupuesto_anual.año_fiscal) {
    return res.status(200).json({
      success: true,
      message: 'Este proyecto no tiene presupuesto anual configurado',
      data: {
        configurado: false,
        presupuesto_anual: null,
        metricas: null
      }
    });
  }

  // Calcular actividades ejecutadas (consulta a PAL)
  const PAL = require('../models/proyectoActividadLote.model');
  const actividadesEjecutadas = await PAL.countDocuments({
    proyecto: id,
    estado: { $in: ['CUMPLIDA', 'EN_EJECUCION'] }
  });

  // Calcular monto ejecutado (consulta a precios negociados y cantidad ejecutada)
  const PrecioNegociado = require('../models/precioNegociado.model');
  
  // Obtener todos los PAL del proyecto con sus precios activos
  const palsConPrecios = await PAL.find({ proyecto: id })
    .select('_id cantidad_ejecutada');
  
  const palIds = palsConPrecios.map(p => p._id);
  
  // Obtener precios activos para esos PALs
  const precios = await PrecioNegociado.find({
    proyecto_actividad_lote: { $in: palIds },
    activo: true
  }).select('proyecto_actividad_lote precio_acordado');
  
  // Calcular monto ejecutado
  let montoEjecutado = 0;
  palsConPrecios.forEach(pal => {
    const precio = precios.find(p => 
      p.proyecto_actividad_lote.toString() === pal._id.toString()
    );
    
    if (precio && pal.cantidad_ejecutada) {
      montoEjecutado += pal.cantidad_ejecutada * precio.precio_acordado;
    }
  });

  // Construir respuesta con métricas
  const presupuesto = {
    configurado: true,
    presupuesto_anual: proyecto.presupuesto_anual.toObject(),
    presupuesto_por_intervencion: proyecto.presupuesto_por_intervencion,
    metricas: {
      actividades: {
        planeadas: proyecto.presupuesto_anual.cantidad_actividades_planeadas || 0,
        ejecutadas: actividadesEjecutadas,
        pendientes: (proyecto.presupuesto_anual.cantidad_actividades_planeadas || 0) - actividadesEjecutadas,
        porcentaje_ejecucion: proyecto.presupuesto_anual.cantidad_actividades_planeadas 
          ? Number(((actividadesEjecutadas / proyecto.presupuesto_anual.cantidad_actividades_planeadas) * 100).toFixed(2))
          : 0
      },
      presupuesto: {
        planeado: proyecto.presupuesto_anual.monto_presupuestado || 0,
        ejecutado: Number(montoEjecutado.toFixed(2)),
        disponible: Number(((proyecto.presupuesto_anual.monto_presupuestado || 0) - montoEjecutado).toFixed(2)),
        porcentaje_ejecucion: proyecto.presupuesto_anual.monto_presupuestado
          ? Number((((montoEjecutado) / proyecto.presupuesto_anual.monto_presupuestado) * 100).toFixed(2))
          : 0
      }
    }
  };

  res.status(200).json({
    success: true,
    data: presupuesto
  });
});

/**
 * @desc    Obtener resumen de presupuestos de todos los proyectos
 * @route   GET /api/v1/proyectos/presupuestos/resumen
 * @access  Private (ADMIN_SISTEMA, JEFE_OPERACIONES)
 */
const obtenerResumenPresupuestos = asyncHandler(async (req, res) => {
  const { año_fiscal } = req.query;

  const filter = {};
  
  if (año_fiscal) {
    filter['presupuesto_anual.año_fiscal'] = parseInt(año_fiscal);
  }

  const proyectos = await Proyecto.find(filter)
    .select('codigo nombre presupuesto_anual presupuesto_por_intervencion estado')
    .populate('presupuesto_anual.aprobado_por', 'nombres apellidos')
    .sort({ 'presupuesto_anual.año_fiscal': -1, codigo: 1 });

  // Calcular totales
  const totales = proyectos.reduce((acc, proyecto) => {
    if (proyecto.presupuesto_anual?.año_fiscal) {
      acc.cantidad_actividades += proyecto.presupuesto_anual.cantidad_actividades_planeadas || 0;
      acc.monto_presupuestado += proyecto.presupuesto_anual.monto_presupuestado || 0;
    }
    return acc;
  }, { cantidad_actividades: 0, monto_presupuestado: 0 });

  res.status(200).json({
    success: true,
    count: proyectos.length,
    totales,
    data: proyectos
  });
});

// ====================================================================
// EXPORTS
// ====================================================================

module.exports = {
  // Funciones existentes
  getProyectos,
  getProyecto,
  getResumenProyecto,
  createProyecto,
  updateProyecto,
  deleteProyecto, // ⬅️ NUEVA FUNCIÓN
  cerrarProyecto,
  puedeObtenerProyecto,
  // Nuevas funciones de presupuesto
  actualizarPresupuestoAnual,
  obtenerPresupuestoAnual,
  obtenerResumenPresupuestos
};