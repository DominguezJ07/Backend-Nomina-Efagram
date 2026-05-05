/**
 * proyecto.controller.js
 * Ruta: src/Proyectos/controllers/proyecto.controller.js
 */

const Proyecto = require('../models/proyecto.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');
const mongoose = require('mongoose');
const {
  sanitizePersona,
  sanitizeZona,
  sanitizeClienteRef,
} = require('../utils/sanitizer');

// ── Normalizar actividades de intervención ────────────────────────────
const normalizarActividades = (actividades_por_intervencion) => {
  const tipos = ['mantenimiento', 'no_programadas', 'establecimiento'];
  const result = {};

  for (const tipo of tipos) {
    const raw = actividades_por_intervencion?.[tipo];
    result[tipo] = Array.isArray(raw)
      ? raw.map((act) => ({
          nombre:          String(act.nombre  || '').trim(),
          precio_unitario: Number(act.precio_unitario) || 0,
          cantidad:        Number(act.cantidad)        || 0,
          unidad:          String(act.unidad  || 'hectareas').trim(),
          estado:          String(act.estado  || 'Pendiente').trim(),
          // 🚫 campos desconocidos del input son descartados aquí
        }))
      : [];
  }

  return result;
};

// ── 1. OBTENER TODOS LOS PROYECTOS ───────────────────────────────────
const getProyectos = asyncHandler(async (req, res) => {
  const { estado } = req.query;

  const filter = {};
  if (estado) filter.estado = estado;

  // ✅ SIN populate — cliente embebido
  const proyectos = await Proyecto.find(filter).sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: proyectos.length, data: proyectos });
});

// ── 2. OBTENER UN PROYECTO ───────────────────────────────────────────
const getProyecto = asyncHandler(async (req, res) => {
  const proyecto = await Proyecto.findById(req.params.id);
  if (!proyecto) throw new ApiError(404, 'Proyecto no encontrado');

  res.status(200).json({ success: true, data: proyecto });
});

// ── 3. RESUMEN ───────────────────────────────────────────────────────
const getResumenProyecto = asyncHandler(async (req, res) => {
  const proyecto = await Proyecto.findById(req.params.id);
  if (!proyecto) throw new ApiError(404, 'Proyecto no encontrado');

  res.status(200).json({ success: true, data: proyecto });
});

// ── 4. CREAR PROYECTO ────────────────────────────────────────────────
/**
 * Body esperado:
 * {
 *   codigo:       "PRY-001",
 *   nombre:       "Proyecto Cacao Norte",
 *   cliente:      { nombre: "Agro S.A.", nit: "900123456-1" },
 *   zona:         { codigo: "Z01", nombre: "Zona Norte" },        // opcional
 *   responsable:  { documento: "123456", nombre: "Ana López" },   // opcional
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
  const {
    codigo, nombre,
    fecha_inicio, fecha_fin_estimada, tipo_contrato,
    descripcion, avance,
    actividades_por_intervencion,
  } = req.body;

  // ── Validaciones simples ──
  if (!codigo || !String(codigo).trim()) throw new ApiError(400, 'El código es obligatorio');
  if (!nombre || !String(nombre).trim()) throw new ApiError(400, 'El nombre es obligatorio');
  if (!fecha_inicio)                     throw new ApiError(400, 'La fecha de inicio es obligatoria');

  // ── Sanitización de objetos embebidos ──
  const cliente     = sanitizeClienteRef(req.body.cliente, 'cliente');
  const zona        = req.body.zona        ? sanitizeZona(req.body.zona,             'zona')        : null;
  const responsable = req.body.responsable ? sanitizePersona(req.body.responsable,   'responsable') : null;

  const actividadesNormalizadas = normalizarActividades(actividades_por_intervencion);

  const proyecto = await Proyecto.create({
    codigo:      String(codigo).trim().toUpperCase(),
    nombre:      String(nombre).trim(),
    descripcion: descripcion ? String(descripcion).trim() : undefined,
    cliente,
    zona,
    responsable,
    fecha_inicio,
    fecha_fin_estimada:          fecha_fin_estimada || null,
    tipo_contrato,
    avance:                      Number(avance) || 0,
    actividades_por_intervencion: actividadesNormalizadas,
  });

  res.status(201).json({ success: true, message: 'Proyecto creado exitosamente', data: proyecto });
});

// ── 5. ACTUALIZAR PROYECTO ───────────────────────────────────────────
const updateProyecto = asyncHandler(async (req, res) => {
  const proyecto = await Proyecto.findById(req.params.id);
  if (!proyecto) throw new ApiError(404, 'Proyecto no encontrado');

  // Whitelist de campos escalares actualizables
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

  // Sanitizar objetos embebidos si vienen en el body
  if (req.body.cliente !== undefined) {
    if (req.body.cliente === null) throw new ApiError(400, 'El cliente no puede ser nulo');
    proyecto.cliente = sanitizeClienteRef(req.body.cliente, 'cliente');
  }

  if (req.body.zona !== undefined) {
    proyecto.zona = req.body.zona === null
      ? null
      : sanitizeZona(req.body.zona, 'zona');
  }

  if (req.body.responsable !== undefined) {
    proyecto.responsable = req.body.responsable === null
      ? null
      : sanitizePersona(req.body.responsable, 'responsable');
  }

  if (req.body.actividades_por_intervencion !== undefined) {
    proyecto.actividades_por_intervencion = normalizarActividades(
      req.body.actividades_por_intervencion
    );
  }

  await proyecto.save();
  res.status(200).json({ success: true, message: 'Proyecto actualizado exitosamente', data: proyecto });
});

// ── 6. ELIMINAR PROYECTO ─────────────────────────────────────────────
const deleteProyecto = asyncHandler(async (req, res) => {
  const proyecto = await Proyecto.findById(req.params.id);
  if (!proyecto) throw new ApiError(404, 'Proyecto no encontrado');

  const PAL = require('../models/proyectoActividadLote.model');
  const tieneActividades = await PAL.countDocuments({ proyecto: req.params.id });
  if (tieneActividades > 0) {
    throw new ApiError(400, `No se puede eliminar el proyecto. Tiene ${tieneActividades} actividades asociadas.`);
  }

  await proyecto.deleteOne();
  res.status(200).json({ success: true, message: 'Proyecto eliminado exitosamente', data: {} });
});

// ── 7. CERRAR PROYECTO ───────────────────────────────────────────────
const cerrarProyecto = asyncHandler(async (req, res) => {
  const proyecto = await Proyecto.findById(req.params.id);
  if (!proyecto) throw new ApiError(404, 'Proyecto no encontrado');

  proyecto.estado        = 'CERRADO';
  proyecto.fecha_fin_real = new Date();
  await proyecto.save();

  res.status(200).json({ success: true, message: 'Proyecto cerrado exitosamente', data: proyecto });
});

// ── 8. PUEDE CERRAR ──────────────────────────────────────────────────
const puedeObtenerProyecto = asyncHandler(async (req, res) => {
  const proyecto = await Proyecto.findById(req.params.id);
  if (!proyecto) throw new ApiError(404, 'Proyecto no encontrado');

  res.status(200).json({ success: true, puede_cerrar: true, data: proyecto });
});

// ── 9. PRESUPUESTO ANUAL ─────────────────────────────────────────────
const actualizarPresupuestoAnual = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    cantidad_actividades_planeadas, monto_presupuestado,
    año_fiscal, observaciones_presupuesto, presupuesto_por_intervencion,
  } = req.body;

  const proyecto = await Proyecto.findById(id);
  if (!proyecto) throw new ApiError(404, 'Proyecto no encontrado');

  if (!año_fiscal || año_fiscal < 2020 || año_fiscal > 2100) throw new ApiError(400, 'El año fiscal es inválido');
  if (cantidad_actividades_planeadas < 0) throw new ApiError(400, 'La cantidad de actividades no puede ser negativa');
  if (monto_presupuestado < 0)            throw new ApiError(400, 'El monto presupuestado no puede ser negativo');

  if (presupuesto_por_intervencion) {
    const totalActs =
      (presupuesto_por_intervencion.mantenimiento?.cantidad_actividades  || 0) +
      (presupuesto_por_intervencion.no_programadas?.cantidad_actividades || 0) +
      (presupuesto_por_intervencion.establecimiento?.cantidad_actividades || 0);
    const totalMonto =
      (presupuesto_por_intervencion.mantenimiento?.monto_presupuestado  || 0) +
      (presupuesto_por_intervencion.no_programadas?.monto_presupuestado || 0) +
      (presupuesto_por_intervencion.establecimiento?.monto_presupuestado || 0);

    if (totalActs  > cantidad_actividades_planeadas) throw new ApiError(400, `Total actividades (${totalActs}) excede lo planeado`);
    if (totalMonto > monto_presupuestado)             throw new ApiError(400, `Total presupuesto ($${totalMonto}) excede lo planeado`);
  }

  proyecto.presupuesto_anual = {
    cantidad_actividades_planeadas: cantidad_actividades_planeadas || 0,
    monto_presupuestado:            monto_presupuestado || 0,
    año_fiscal,
    fecha_aprobacion:               new Date(),
    aprobado_por:                   req.user.id,
    observaciones_presupuesto,
  };

  if (presupuesto_por_intervencion) {
    proyecto.presupuesto_por_intervencion = {
      mantenimiento:   {
        cantidad_actividades: presupuesto_por_intervencion.mantenimiento?.cantidad_actividades  || 0,
        monto_presupuestado:  presupuesto_por_intervencion.mantenimiento?.monto_presupuestado   || 0,
      },
      no_programadas:  {
        cantidad_actividades: presupuesto_por_intervencion.no_programadas?.cantidad_actividades || 0,
        monto_presupuestado:  presupuesto_por_intervencion.no_programadas?.monto_presupuestado  || 0,
      },
      establecimiento: {
        cantidad_actividades: presupuesto_por_intervencion.establecimiento?.cantidad_actividades || 0,
        monto_presupuestado:  presupuesto_por_intervencion.establecimiento?.monto_presupuestado  || 0,
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
      data: { configurado: false, presupuesto_anual: null, metricas: null },
    });
  }

  const PAL            = require('../models/proyectoActividadLote.model');
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