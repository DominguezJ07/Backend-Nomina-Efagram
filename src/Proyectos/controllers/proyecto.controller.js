/**
 * proyecto.controller.js
 * Ruta: src/Proyectos/controllers/proyecto.controller.js
 *
 * ✅ Sin populate
 * ✅ Sin ObjectId en subdocumentos
 * ✅ Todos los arrays transformados con .map() antes de guardar
 * ✅ Nunca se usa req.body directo
 */

const Proyecto = require('../models/proyecto.model');
const mongoose = require('mongoose');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');
const { sanitizePersona, sanitizeZona, sanitizeClienteRef, sanitizeFincas, sanitizePersonas, sanitizeNucleos, _str, _num } = require('../utils/sanitizer');

// ── Transformación de actividades por intervención ────────────
// ✅ .map() interno — nunca se guarda el array crudo
const mapActividades = (arr) =>
  (arr || []).map(a => ({
    nombre:          _str(a.nombre,          ''),
    precio_unitario: _num(a.precio_unitario,  0),
    cantidad:        _num(a.cantidad,          0),
    unidad:          _str(a.unidad, 'hectareas'),
    estado:          _str(a.estado, 'Pendiente'),
  }));

// ── Helper para obtener ObjectId válido ──────────────────────
const getMongoId = (value) => {
  if (!value) return undefined;

  if (typeof value === 'string') {
    return mongoose.Types.ObjectId.isValid(value) ? value : undefined;
  }

  if (typeof value === 'object') {
    const id = value._id || value.id || value.value;
    return mongoose.Types.ObjectId.isValid(id) ? id : undefined;
  }

  return undefined;
};

// ── Transformación central de req.body ────────────────────────
// ✅ NUNCA se usa req.body directo — todo pasa por esta función
const transformarBody = (body) => ({
  codigo:      _str(body.codigo) ? _str(body.codigo).toUpperCase() : undefined,
  nombre:      _str(body.nombre),
  descripcion: _str(body.descripcion, undefined),

  // ✅ Cliente — referencia ObjectId
  cliente: getMongoId(body.cliente),

  // ✅ Zona — objeto plano sanitizado
  zona: body.zona
    ? {
        nombre: _str(body.zona.nombre, null),
        codigo: _str(body.zona.codigo, null),
      }
    : undefined,

  // ✅ Responsable — objeto plano sanitizado
  responsable: body.responsable
    ? {
        nombre:    _str(body.responsable.nombre,    null),
        documento: _str(body.responsable.documento, null),
        cargo:     _str(body.responsable.cargo,     null),
      }
    : null,

  fecha_inicio:       body.fecha_inicio,
  fecha_fin_estimada: body.fecha_fin_estimada || null,
  fecha_fin_real:     body.fecha_fin_real     || null,
  tipo_contrato:      body.tipo_contrato,
  valor_contrato:     _num(body.valor_contrato, undefined),
  avance:             _num(body.avance, 0),
  observaciones:      _str(body.observaciones, undefined),
  estado:             body.estado,

  // ✅ Actividades por intervención — transformadas con .map()
  actividades_por_intervencion: body.actividades_por_intervencion
    ? {
        mantenimiento:   mapActividades(body.actividades_por_intervencion.mantenimiento),
        no_programadas:  mapActividades(body.actividades_por_intervencion.no_programadas),
        establecimiento: mapActividades(body.actividades_por_intervencion.establecimiento),
      }
    : undefined,

  // ✅ Arrays planos con .map()
  fincas: body.fincas ? sanitizeFincas(body.fincas) : undefined,

  personal: body.personal ? sanitizePersonas(body.personal) : undefined,

  zonas: body.zonas ? (body.zonas || [])
    .map((z) => sanitizeZona(z, 'zonas[]'))
    .filter(Boolean)
    : undefined,

  nucleos: body.nucleos ? sanitizeNucleos(body.nucleos) : undefined,

  actividades: (body.actividades || []).map(a => ({
    actividad: {
      nombre: _str(a.actividad?.nombre, null),
    },
    asignacion_subproyecto: {
      nombre: _str(a.asignacion_subproyecto?.nombre, null),
    },
    cantidad:        _num(a.cantidad,        0),
    precio_unitario: _num(a.precio_unitario, 0),
  })),
});

// ── 1. GET TODOS ──────────────────────────────────────────────
const getProyectos = asyncHandler(async (req, res) => {
  const { estado } = req.query;
  const filter = {};
  if (estado) filter.estado = estado;

  const proyectos = await Proyecto.find(filter)
    .populate('cliente', 'codigo nit razon_social nombre_comercial activo')
    .sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: proyectos.length, data: proyectos });
});

// ── 2. GET UNO ────────────────────────────────────────────────
const getProyecto = asyncHandler(async (req, res) => {
  const proyecto = await Proyecto.findById(req.params.id)
    .populate('cliente', 'codigo nit razon_social nombre_comercial activo');
  if (!proyecto) throw new ApiError(404, 'Proyecto no encontrado');
  res.status(200).json({ success: true, data: proyecto });
});

// ── 3. RESUMEN ────────────────────────────────────────────────
const getResumenProyecto = asyncHandler(async (req, res) => {
  const proyecto = await Proyecto.findById(req.params.id)
    .populate('cliente', 'codigo nit razon_social nombre_comercial activo');
  if (!proyecto) throw new ApiError(404, 'Proyecto no encontrado');
  res.status(200).json({ success: true, data: proyecto });
});

// ── 4. CREAR ──────────────────────────────────────────────────
const createProyecto = asyncHandler(async (req, res) => {
  // ✅ NUNCA req.body directo — pasa por transformarBody()
  const data = transformarBody(req.body);

  if (!data.codigo) {
    throw new ApiError(400, 'El código es obligatorio');
  }

  if (!data.nombre) {
    throw new ApiError(400, 'El nombre es obligatorio');
  }

  if (!data.fecha_inicio) {
    throw new ApiError(400, 'La fecha de inicio es obligatoria');
  }

  if (!data.cliente) {
    throw new ApiError(400, 'El cliente es obligatorio');
  }

  const proyecto = await Proyecto.create(data);

  const proyectoPopulado = await Proyecto.findById(proyecto._id)
    .populate('cliente', 'codigo nit razon_social nombre_comercial activo');

  res.status(201).json({
    success: true,
    message: 'Proyecto creado exitosamente',
    data: proyectoPopulado,
  });
});

// ── 5. ACTUALIZAR ─────────────────────────────────────────────
const updateProyecto = asyncHandler(async (req, res) => {
  const proyecto = await Proyecto.findById(req.params.id);
  if (!proyecto) throw new ApiError(404, 'Proyecto no encontrado');

  // ✅ NUNCA req.body directo — pasa por transformarBody()
  const data = transformarBody(req.body);

  // Aplicar solo los campos que vienen en el body
  const CAMPOS_ESCALARES = [
    'nombre', 'descripcion', 'fecha_inicio', 'fecha_fin_estimada',
    'fecha_fin_real', 'tipo_contrato', 'valor_contrato',
    'estado', 'avance', 'observaciones',
  ];
  for (const campo of CAMPOS_ESCALARES) {
    if (data[campo] !== undefined) proyecto[campo] = data[campo];
  }

  if (data.cliente     !== undefined) proyecto.cliente     = data.cliente;
  if (data.zona        !== undefined) proyecto.zona        = data.zona;
  if (data.responsable !== undefined) proyecto.responsable = data.responsable;

  if (data.actividades_por_intervencion !== undefined) {
    proyecto.actividades_por_intervencion = data.actividades_por_intervencion;
  }

  // Arrays planos
  if (req.body.fincas     !== undefined) proyecto.fincas     = data.fincas;
  if (req.body.personal   !== undefined) proyecto.personal   = data.personal;
  if (req.body.zonas      !== undefined) proyecto.zonas      = data.zonas;
  if (req.body.nucleos    !== undefined) proyecto.nucleos    = data.nucleos;
  if (req.body.actividades !== undefined) proyecto.actividades = data.actividades;

  await proyecto.save();

  const proyectoPopulado = await Proyecto.findById(proyecto._id)
    .populate('cliente', 'codigo nit razon_social nombre_comercial activo');

  res.status(200).json({
    success: true,
    message: 'Proyecto actualizado exitosamente',
    data: proyectoPopulado,
  });
});

// ── 6. ELIMINAR ───────────────────────────────────────────────
const deleteProyecto = asyncHandler(async (req, res) => {
  const proyecto = await Proyecto.findById(req.params.id);
  if (!proyecto) throw new ApiError(404, 'Proyecto no encontrado');

  const PAL              = require('../models/proyectoActividadLote.model');
  const tieneActividades = await PAL.countDocuments({ proyecto: req.params.id });
  if (tieneActividades > 0) {
    throw new ApiError(400, `No se puede eliminar. Tiene ${tieneActividades} actividades asociadas.`);
  }

  await proyecto.deleteOne();
  res.status(200).json({ success: true, message: 'Proyecto eliminado exitosamente', data: {} });
});

// ── 7. CERRAR ─────────────────────────────────────────────────
const cerrarProyecto = asyncHandler(async (req, res) => {
  const proyecto = await Proyecto.findById(req.params.id);
  if (!proyecto) throw new ApiError(404, 'Proyecto no encontrado');

  proyecto.estado         = 'CERRADO';
  proyecto.fecha_fin_real = new Date();
  await proyecto.save();

  res.status(200).json({ success: true, message: 'Proyecto cerrado exitosamente', data: proyecto });
});

// ── 8. PUEDE CERRAR ───────────────────────────────────────────
const puedeObtenerProyecto = asyncHandler(async (req, res) => {
  const proyecto = await Proyecto.findById(req.params.id);
  if (!proyecto) throw new ApiError(404, 'Proyecto no encontrado');
  res.status(200).json({ success: true, puede_cerrar: true, data: proyecto });
});

// ── 9. PRESUPUESTO ANUAL ──────────────────────────────────────
const actualizarPresupuestoAnual = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    cantidad_actividades_planeadas,
    monto_presupuestado,
    año_fiscal,
    observaciones_presupuesto,
    presupuesto_por_intervencion,
  } = req.body;

  const proyecto = await Proyecto.findById(id);
  if (!proyecto) throw new ApiError(404, 'Proyecto no encontrado');

  if (!año_fiscal || año_fiscal < 2020 || año_fiscal > 2100) throw new ApiError(400, 'Año fiscal inválido');
  if (cantidad_actividades_planeadas < 0) throw new ApiError(400, 'La cantidad no puede ser negativa');
  if (monto_presupuestado < 0)            throw new ApiError(400, 'El monto no puede ser negativo');

  if (presupuesto_por_intervencion) {
    const totalActs =
      _num(presupuesto_por_intervencion.mantenimiento?.cantidad_actividades)  +
      _num(presupuesto_por_intervencion.no_programadas?.cantidad_actividades) +
      _num(presupuesto_por_intervencion.establecimiento?.cantidad_actividades);
    const totalMonto =
      _num(presupuesto_por_intervencion.mantenimiento?.monto_presupuestado)  +
      _num(presupuesto_por_intervencion.no_programadas?.monto_presupuestado) +
      _num(presupuesto_por_intervencion.establecimiento?.monto_presupuestado);

    if (totalActs  > cantidad_actividades_planeadas) throw new ApiError(400, `Total actividades (${totalActs}) excede lo planeado`);
    if (totalMonto > monto_presupuestado)             throw new ApiError(400, `Total presupuesto excede lo planeado`);
  }

  proyecto.presupuesto_anual = {
    cantidad_actividades_planeadas: _num(cantidad_actividades_planeadas),
    monto_presupuestado:            _num(monto_presupuestado),
    año_fiscal,
    fecha_aprobacion:               new Date(),
    aprobado_por:                   req.user?.id,
    observaciones_presupuesto,
  };

  if (presupuesto_por_intervencion) {
    proyecto.presupuesto_por_intervencion = {
      mantenimiento:   {
        cantidad_actividades: _num(presupuesto_por_intervencion.mantenimiento?.cantidad_actividades),
        monto_presupuestado:  _num(presupuesto_por_intervencion.mantenimiento?.monto_presupuestado),
      },
      no_programadas:  {
        cantidad_actividades: _num(presupuesto_por_intervencion.no_programadas?.cantidad_actividades),
        monto_presupuestado:  _num(presupuesto_por_intervencion.no_programadas?.monto_presupuestado),
      },
      establecimiento: {
        cantidad_actividades: _num(presupuesto_por_intervencion.establecimiento?.cantidad_actividades),
        monto_presupuestado:  _num(presupuesto_por_intervencion.establecimiento?.monto_presupuestado),
      },
    };
  }

  await proyecto.save();
  res.status(200).json({ success: true, message: 'Presupuesto actualizado correctamente', data: proyecto });
});

const obtenerPresupuestoAnual = asyncHandler(async (req, res) => {
  const proyecto = await Proyecto.findById(req.params.id);
  if (!proyecto) throw new ApiError(404, 'Proyecto no encontrado');

  if (!proyecto.presupuesto_anual?.año_fiscal) {
    return res.status(200).json({
      success: true,
      message: 'Este proyecto no tiene presupuesto anual configurado',
      data:    { configurado: false, presupuesto_anual: null, metricas: null },
    });
  }

  const PAL             = require('../models/proyectoActividadLote.model');
  const PrecioNegociado = require('../models/precioNegociado.model');

  const actividadesEjecutadas = await PAL.countDocuments({
    proyecto: req.params.id,
    estado:   { $in: ['CUMPLIDA', 'EN_EJECUCION'] },
  });

  const palsConPrecios = await PAL.find({ proyecto: req.params.id }).select('_id cantidad_ejecutada');
  const palIds         = palsConPrecios.map(p => p._id);
  const precios        = await PrecioNegociado.find({
    proyecto_actividad_lote: { $in: palIds },
    activo: true,
  }).select('proyecto_actividad_lote precio_acordado');

  let montoEjecutado = 0;
  palsConPrecios.forEach(pal => {
    const precio = precios.find(p => p.proyecto_actividad_lote.toString() === pal._id.toString());
    if (precio && pal.cantidad_ejecutada) montoEjecutado += pal.cantidad_ejecutada * precio.precio_acordado;
  });

  res.status(200).json({
    success: true,
    data: {
      configurado:                  true,
      presupuesto_anual:            proyecto.presupuesto_anual.toObject(),
      presupuesto_por_intervencion: proyecto.presupuesto_por_intervencion,
      metricas: {
        actividades: {
          planeadas:            proyecto.presupuesto_anual.cantidad_actividades_planeadas || 0,
          ejecutadas:           actividadesEjecutadas,
          pendientes:           (proyecto.presupuesto_anual.cantidad_actividades_planeadas || 0) - actividadesEjecutadas,
          porcentaje_ejecucion: proyecto.presupuesto_anual.cantidad_actividades_planeadas
            ? Number(((actividadesEjecutadas / proyecto.presupuesto_anual.cantidad_actividades_planeadas) * 100).toFixed(2)) : 0,
        },
        presupuesto: {
          planeado:             proyecto.presupuesto_anual.monto_presupuestado || 0,
          ejecutado:            Number(montoEjecutado.toFixed(2)),
          disponible:           Number(((proyecto.presupuesto_anual.monto_presupuestado || 0) - montoEjecutado).toFixed(2)),
          porcentaje_ejecucion: proyecto.presupuesto_anual.monto_presupuestado
            ? Number(((montoEjecutado / proyecto.presupuesto_anual.monto_presupuestado) * 100).toFixed(2)) : 0,
        },
      },
    },
  });
});

const obtenerResumenPresupuestos = asyncHandler(async (req, res) => {
  const { año_fiscal } = req.query;
  const filter = {};
  if (año_fiscal) filter['presupuesto_anual.año_fiscal'] = parseInt(año_fiscal);

  const proyectos = await Proyecto.find(filter)
    .select('codigo nombre presupuesto_anual presupuesto_por_intervencion estado')
    .sort({ 'presupuesto_anual.año_fiscal': -1, codigo: 1 });

  const totales = proyectos.reduce((acc, p) => {
    if (p.presupuesto_anual?.año_fiscal) {
      acc.cantidad_actividades += p.presupuesto_anual.cantidad_actividades_planeadas || 0;
      acc.monto_presupuestado  += p.presupuesto_anual.monto_presupuestado            || 0;
    }
    return acc;
  }, { cantidad_actividades: 0, monto_presupuestado: 0 });

  res.status(200).json({ success: true, count: proyectos.length, totales, data: proyectos });
});

module.exports = {
  getProyectos,
  getProyecto,
  getResumenProyecto,
  createProyecto,
  updateProyecto,
  deleteProyecto,
  cerrarProyecto,
  puedeObtenerProyecto,
  actualizarPresupuestoAnual,
  obtenerPresupuestoAnual,
  obtenerResumenPresupuestos,
};  