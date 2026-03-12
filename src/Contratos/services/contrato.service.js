const Contrato           = require('../models/contrato.model');
const Finca              = require('../../Territorial/models/finca.model');
const Lote               = require('../../Territorial/models/lote.model');
const Cuadrilla          = require('../../Personal/models/cuadrilla.model');
const ActividadCatalogo  = require('../../Proyectos/models/actividadCatalogo.model');
const AsignacionActividad = require('../../Proyectos/models/asignacionActividad.model');
const Subproyecto        = require('../../Proyectos/models/subproyecto.model');
const { ApiError }       = require('../../middlewares/errorHandler');

// ── Valida que el subproyecto exista y esté activo ─────────────────
const validateSubproyecto = async (subproyectoId) => {
  const sub = await Subproyecto.findById(subproyectoId);
  if (!sub) throw new ApiError(404, 'Subproyecto no encontrado');
  if (sub.estado !== 'ACTIVO') throw new ApiError(400, 'El subproyecto no está activo');
  return sub;
};

// ── Valida que la finca exista y esté activa ───────────────────────
const validateFinca = async (fincaId) => {
  const finca = await Finca.findById(fincaId);
  if (!finca) throw new ApiError(404, 'Finca no encontrada');
  if (!finca.activa) throw new ApiError(400, 'La finca seleccionada está inactiva');
  return finca;
};

// ── Valida que los lotes existan, estén activos y pertenezcan a la finca ──
const validateLotes = async (loteIds, fincaId) => {
  if (!loteIds || loteIds.length === 0) {
    throw new ApiError(400, 'Debe seleccionar al menos un lote');
  }
  const lotes = await Lote.find({ _id: { $in: loteIds }, finca: fincaId, activo: true });
  if (lotes.length !== loteIds.length) {
    throw new ApiError(400, 'Uno o más lotes no existen, están inactivos, o no pertenecen a la finca seleccionada');
  }
  return lotes;
};

// ── Valida actividades con cantidad y precio vs AsignacionActividad ─
// actividades = [{ actividad: id, cantidad: n, precio_unitario: n, asignacion_subproyecto: id }]
const validateActividadesConCantidad = async (actividades, subproyectoId) => {
  if (!actividades || actividades.length === 0) {
    throw new ApiError(400, 'Debe incluir al menos una actividad');
  }

  // Verificar que todas las actividades del catálogo existan y estén activas
  const actividadIds = actividades.map(a => a.actividad);
  const catalogos = await ActividadCatalogo.find({ _id: { $in: actividadIds }, activa: true });
  if (catalogos.length !== actividadIds.length) {
    throw new ApiError(400, 'Una o más actividades no existen o están inactivas');
  }

  // Para cada actividad, validar que la cantidad no exceda la asignada al subproyecto
  for (const item of actividades) {
    const cantidad = Number(item.cantidad);
    const precio   = Number(item.precio_unitario);

    if (!cantidad || cantidad <= 0) {
      throw new ApiError(400, `La cantidad debe ser mayor a 0 para la actividad ${item.actividad}`);
    }
    if (precio < 0) {
      throw new ApiError(400, `El precio no puede ser negativo para la actividad ${item.actividad}`);
    }

    // Buscar la asignación de esta actividad en el subproyecto
    // La asignación vincula la actividad (via actividad_proyecto) con el subproyecto
    // Necesitamos encontrar qué cantidad tiene disponible el subproyecto para esta actividad
    const asignaciones = await AsignacionActividad.find({
      subproyecto: subproyectoId,
      estado: { $ne: 'CANCELADA' },
    }).populate({
      path: 'actividad_proyecto',
      match: { actividad: item.actividad },
      select: 'actividad cantidad_total',
    });

    // Filtrar solo las que tienen la actividad correcta (populate puede devolver null)
    const asignacionValida = asignaciones.find(
      a => a.actividad_proyecto !== null
    );

    if (!asignacionValida) {
      const cat = catalogos.find(c => c._id.toString() === item.actividad.toString());
      throw new ApiError(
        400,
        `La actividad "${cat?.nombre ?? item.actividad}" no está asignada a este subproyecto. ` +
        `Solo puedes usar actividades que el subproyecto tenga asignadas.`
      );
    }

    // Calcular cuánta cantidad ya está comprometida en otros contratos activos
    // para esta misma asignación de subproyecto
    const contratosActivos = await Contrato.find({
      subproyecto: subproyectoId,
      estado: { $in: ['BORRADOR', 'ACTIVO'] },
      'actividades.asignacion_subproyecto': asignacionValida._id,
    });

    const cantidadEnContratos = contratosActivos.reduce((sum, c) => {
      const act = c.actividades.find(
        a => a.asignacion_subproyecto?.toString() === asignacionValida._id.toString()
      );
      return sum + (act ? Number(act.cantidad) : 0);
    }, 0);

    const cantidadDisponible = asignacionValida.cantidad_asignada - cantidadEnContratos;

    if (cantidad > cantidadDisponible) {
      const cat = catalogos.find(c => c._id.toString() === item.actividad.toString());
      throw new ApiError(
        400,
        `Actividad "${cat?.nombre ?? item.actividad}": ` +
        `la cantidad solicitada (${cantidad}) supera la disponible en el subproyecto ` +
        `(${cantidadDisponible.toFixed(2)}). ` +
        `Asignado al subproyecto: ${asignacionValida.cantidad_asignada}, ` +
        `Ya en contratos: ${cantidadEnContratos.toFixed(2)}.`
      );
    }

    // Guardar referencia a la asignación para usarla en el controller
    item._asignacion_id = asignacionValida._id;
  }

  return actividades;
};

// ── Igual que la anterior pero excluyendo el contrato actual (para update) ──
const validateActividadesConCantidadUpdate = async (actividades, subproyectoId, contratoExcluidoId) => {
  if (!actividades || actividades.length === 0) {
    throw new ApiError(400, 'Debe incluir al menos una actividad');
  }

  const actividadIds = actividades.map(a => a.actividad);
  const catalogos = await ActividadCatalogo.find({ _id: { $in: actividadIds }, activa: true });
  if (catalogos.length !== actividadIds.length) {
    throw new ApiError(400, 'Una o más actividades no existen o están inactivas');
  }

  for (const item of actividades) {
    const cantidad = Number(item.cantidad);
    const precio   = Number(item.precio_unitario);

    if (!cantidad || cantidad <= 0) {
      throw new ApiError(400, `La cantidad debe ser mayor a 0 para la actividad ${item.actividad}`);
    }
    if (precio < 0) {
      throw new ApiError(400, `El precio no puede ser negativo para la actividad ${item.actividad}`);
    }

    const asignaciones = await AsignacionActividad.find({
      subproyecto: subproyectoId,
      estado: { $ne: 'CANCELADA' },
    }).populate({
      path: 'actividad_proyecto',
      match: { actividad: item.actividad },
      select: 'actividad cantidad_total',
    });

    const asignacionValida = asignaciones.find(a => a.actividad_proyecto !== null);

    if (!asignacionValida) {
      const cat = catalogos.find(c => c._id.toString() === item.actividad.toString());
      throw new ApiError(
        400,
        `La actividad "${cat?.nombre ?? item.actividad}" no está asignada a este subproyecto.`
      );
    }

    // Excluir el contrato actual del cálculo
    const contratosActivos = await Contrato.find({
      subproyecto: subproyectoId,
      estado: { $in: ['BORRADOR', 'ACTIVO'] },
      'actividades.asignacion_subproyecto': asignacionValida._id,
      _id: { $ne: contratoExcluidoId },
    });

    const cantidadEnOtrosContratos = contratosActivos.reduce((sum, c) => {
      const act = c.actividades.find(
        a => a.asignacion_subproyecto?.toString() === asignacionValida._id.toString()
      );
      return sum + (act ? Number(act.cantidad) : 0);
    }, 0);

    const cantidadDisponible = asignacionValida.cantidad_asignada - cantidadEnOtrosContratos;

    if (cantidad > cantidadDisponible) {
      const cat = catalogos.find(c => c._id.toString() === item.actividad.toString());
      throw new ApiError(
        400,
        `Actividad "${cat?.nombre ?? item.actividad}": ` +
        `la cantidad solicitada (${cantidad}) supera la disponible (${cantidadDisponible.toFixed(2)}).`
      );
    }

    item._asignacion_id = asignacionValida._id;
  }

  return actividades;
};

// ── Valida que la cuadrilla exista y esté activa ──────────────────
const validateCuadrilla = async (cuadrillaId) => {
  const cuadrilla = await Cuadrilla.findById(cuadrillaId)
    .populate('supervisor', 'nombres apellidos num_doc')
    .populate('miembros.persona', 'nombres apellidos num_doc estado');
  if (!cuadrilla) throw new ApiError(404, 'Cuadrilla no encontrada');
  if (!cuadrilla.activa) throw new ApiError(400, 'La cuadrilla seleccionada está inactiva');
  return cuadrilla;
};

const validateContratoExists = async (contratoId) => {
  const contrato = await Contrato.findById(contratoId);
  if (!contrato) throw new ApiError(404, 'Contrato no encontrado');
  return contrato;
};

const validateCodigoUnico = async (codigo, excludeId = null) => {
  const query = { codigo: codigo.toUpperCase() };
  if (excludeId) query._id = { $ne: excludeId };
  const existe = await Contrato.findOne(query);
  if (existe) throw new ApiError(409, `Ya existe un contrato con el código "${codigo}"`);
};

module.exports = {
  validateSubproyecto,
  validateFinca,
  validateLotes,
  validateActividadesConCantidad,
  validateActividadesConCantidadUpdate,
  validateCuadrilla,
  validateContratoExists,
  validateCodigoUnico,
};