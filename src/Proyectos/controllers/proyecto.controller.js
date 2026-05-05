/**
 * proyecto.controller.js
 * Ruta: src/Proyectos/controllers/proyecto.controller.js
 *
 * ✅ Sin populate
 * ✅ Sin ObjectId en subdocumentos
 * ✅ Transformación con .map() antes de guardar
 * ✅ Sanitización completa del req.body
 */

const Proyecto = require('../models/proyecto.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');
const {
  sanitizePersona,
  sanitizeZona,
  sanitizeClienteRef,
  _str,
  _num,
} = require('../utils/sanitizer');

// ── Normalizar actividades de intervención ────────────────────
const normalizarActividades = (actividades_por_intervencion) => {
  const tipos = ['mantenimiento', 'no_programadas', 'establecimiento'];
  const result = {};

  for (const tipo of tipos) {
    const raw = actividades_por_intervencion?.[tipo];
    // ✅ Transformación con .map() — nunca se guarda el array crudo
    result[tipo] = Array.isArray(raw)
      ? raw.map((act) => ({
          nombre:          _str(act.nombre,          ''),
          precio_unitario: _num(act.precio_unitario,  0),
          cantidad:        _num(act.cantidad,          0),
          unidad:          _str(act.unidad, 'hectareas'),
          estado:          _str(act.estado, 'Pendiente'),
        }))
      : [];
  }

  return result;
};

// ── 1. GET TODOS ──────────────────────────────────────────────
const getProyectos = asyncHandler(async (req, res) => {
  const { estado } = req.query;
  const filter = {};
  if (estado) filter.estado = estado;

  const proyectos = await Proyecto.find(filter).sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: proyectos.length, data: proyectos });
});

// ── 2. GET UNO ────────────────────────────────────────────────
const getProyecto = asyncHandler(async (req, res) => {
  const proyecto = await Proyecto.findById(req.params.id);
  if (!proyecto) throw new ApiError(404, 'Proyecto no encontrado');

  res.status(200).json({ success: true, data: proyecto });
});

// ── 3. RESUMEN ────────────────────────────────────────────────
const getResumenProyecto = asyncHandler(async (req, res) => {
  const proyecto = await Proyecto.findById(req.params.id);
  if (!proyecto) throw new ApiError(404, 'Proyecto no encontrado');

  res.status(200).json({ success: true, data: proyecto });
});

// ── 4. CREAR ──────────────────────────────────────────────────
/**
 * Body esperado:
 * {
 *   codigo:       "PRY-001",
 *   nombre:       "Proyecto Cacao Norte",
 *   cliente:      { nombre: "Agro S.A.", nit: "900123456-1" },
 *   zona:         { nombre: "Zona Norte", codigo: "Z01" },
 *   responsable:  { nombre: "Ana López", documento: "123456", cargo: "Jefe" },
 *   fecha_inicio: "2024-01-15",
 *   fecha_fin_estimada: "2024-12-31",
 *   tipo_contrato: "FIJO_TODO_COSTO",
 *   descripcion:  "...",
 *   actividades_por_intervencion: {
 *     mantenimiento:   [{ nombre, precio_unitario, cantidad, unidad }],
 *     no_programadas:  [],
 *     establecimiento: []
 *   }
 * }
 */
const createProyecto = asyncHandler(async (req, res) => {
  // ── Validaciones simples ──
  if (!_str(req.body.codigo))       throw new ApiError(400, 'El código es obligatorio');
  if (!_str(req.body.nombre))       throw new ApiError(400, 'El nombre es obligatorio');
  if (!req.body.fecha_inicio)       throw new ApiError(400, 'La fecha de inicio es obligatoria');

  // ── Transformación completa — NO se usa req.body directo ──
  const data = {
    codigo:      _str(req.body.codigo).toUpperCase(),
    nombre:      _str(req.body.nombre),
    descripcion: _str(req.body.descripcion, undefined),

    // ✅ Cliente — objeto plano sanitizado
    cliente: sanitizeClienteRef(req.body.cliente, 'cliente'),

    // ✅ Zona — objeto plano sanitizado (opcional)
    zona: req.body.zona ? sanitizeZona(req.body.zona, 'zona') : undefined,

    // ✅ Responsable — objeto plano sanitizado (opcional)
    responsable: req.body.responsable
      ? sanitizePersona(req.body.responsable, 'responsable')
      : null,

    fecha_inicio:       req.body.fecha_inicio,
    fecha_fin_estimada: req.body.fecha_fin_estimada || null,
    tipo_contrato:      req.body.tipo_contrato,
    valor_contrato:     _num(req.body.valor_contrato, undefined),
    avance:             _num(req.body.avance, 0),
    observaciones:      _str(req.body.observaciones, undefined),

    // ✅ Actividades — transformadas con .map() interno
    actividades_por_intervencion: normalizarActividades(
      req.body.actividades_por_intervencion
    ),
  };

  const proyecto = await Proyecto.create(data);

  res.status(201).json({
    success: true,
    message: 'Proyecto creado exitosamente',
    data:    proyecto,
  });
});

// ── 5. ACTUALIZAR ─────────────────────────────────────────────
const updateProyecto = asyncHandler(async (req, res) => {
  const proyecto = await Proyecto.findById(req.params.id);
  if (!proyecto) throw new ApiError(404, 'Proyecto no encontrado');

  // ✅ Whitelist de campos escalares — no se hace Object.assign(req.body)
  const CAMPOS_ESCALARES = [
    'nombre', 'descripcion', 'fecha_inicio', 'fecha_fin_estimada',
    'fecha_fin_real', 'tipo_contrato', 'valor_contrato', 'estado',
    'avance', 'observaciones',
  ];

  for (const campo of CAMPOS_ESCALARES) {
    if (req.body[campo] !== undefined) {
      proyecto[campo] = req.body[campo];
    }
  }

  // ✅ Objetos embebidos — sanitizados individualmente
  if (req.body.cliente !== undefined) {
    if (!req.body.cliente) throw new ApiError(400, 'El cliente no puede ser nulo');
    proyecto.cliente = sanitizeClienteRef(req.body.cliente, 'cliente');
  }

  if (req.body.zona !== undefined) {
    proyecto.zona = req.body.zona
      ? sanitizeZona(req.body.zona, 'zona')
      : { nombre: null, codigo: null };
  }

  if (req.body.responsable !== undefined) {
    proyecto.responsable = req.body.responsable
      ? sanitizePersona(req.body.responsable, 'responsable')
      : null;
  }

  // ✅ Arrays — transformados con .map() interno
  if (req.body.actividades_por_intervencion !== undefined) {
    proyecto.actividades_por_intervencion = normalizarActividades(
      req.body.actividades_por_intervencion
    );
  }

  await proyecto.save();
  res.status(200).json({
    success: true,
    message: 'Proyecto actualizado exitosamente',
    data:    proyecto,
  });
});

// ── 6. ELIMINAR ───────────────────────────────────────────────
const deleteProyecto = asyncHandler(async (req, res) => {
  const proyecto = await Proyecto.findById(req.params.id);
  if (!proyecto) throw new ApiError(404, 'Proyecto no encontrado');

  const PAL              = require('../models/proyectoActividadLote.model');
  const tieneActividades = await PAL.countDocuments({ proyecto: req.params.id });
  if (tieneActividades > 0) {
    throw new ApiError(400, `No se puede eliminar el proyecto. Tiene ${tieneActividades} actividades asociadas.`);
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

  if (!año_fiscal || año_fiscal < 2020 || año_fiscal > 2100) throw new ApiError(400, 'El año fiscal es inválido');
  if (cantidad_actividades_planeadas < 0) throw new ApiError(400, 'La cantidad de actividades no puede ser negativa');
  if (monto_presupuestado < 0)            throw new ApiError(400, 'El monto presupuestado no puede ser negativo');

  if (presupuesto_por_intervencion) {
    const totalActs =
      (_num(presupuesto_por_intervencion.mantenimiento?.cantidad_actividades)  ) +
      (_num(presupuesto_por_intervencion.no_programadas?.cantidad_actividades) ) +
      (_num(presupuesto_por_intervencion.establecimiento?.cantidad_actividades));
    const totalMonto =
      (_num(presupuesto_por_intervencion.mantenimiento?.monto_presupuestado)  ) +
      (_num(presupuesto_por_intervencion.no_programadas?.monto_presupuestado) ) +
      (_num(presupuesto_por_intervencion.establecimiento?.monto_presupuestado));

    if (totalActs  > cantidad_actividades_planeadas) throw new ApiError(400, `Total actividades (${totalActs}) excede lo planeado`);
    if (totalMonto > monto_presupuestado)             throw new ApiError(400, `Total presupuesto ($${totalMonto}) excede lo planeado`);
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
  res.status(200).json({ success: true, message: 'Presupuesto anual actualizado correctamente', data: proyecto });
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
  const palIds         = palsConPrecios.map((p) => p._id);
  const precios        = await PrecioNegociado.find({
    proyecto_actividad_lote: { $in: palIds },
    activo: true,
  }).select('proyecto_actividad_lote precio_acordado');

  let montoEjecutado = 0;
  palsConPrecios.forEach((pal) => {
    const precio = precios.find(
      (p) => p.proyecto_actividad_lote.toString() === pal._id.toString()
    );
    if (precio && pal.cantidad_ejecutada) {
      montoEjecutado += pal.cantidad_ejecutada * precio.precio_acordado;
    }
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
            ? Number(((actividadesEjecutadas / proyecto.presupuesto_anual.cantidad_actividades_planeadas) * 100).toFixed(2))
            : 0,
        },
        presupuesto: {
          planeado:             proyecto.presupuesto_anual.monto_presupuestado || 0,
          ejecutado:            Number(montoEjecutado.toFixed(2)),
          disponible:           Number(((proyecto.presupuesto_anual.monto_presupuestado || 0) - montoEjecutado).toFixed(2)),
          porcentaje_ejecucion: proyecto.presupuesto_anual.monto_presupuestado
            ? Number(((montoEjecutado / proyecto.presupuesto_anual.monto_presupuestado) * 100).toFixed(2))
            : 0,
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