const Contrato            = require('../models/contrato.model');
const Finca               = require('../../Territorial/models/finca.model');
const Lote                = require('../../Territorial/models/lote.model');
const Cuadrilla           = require('../../Personal/models/cuadrilla.model');
const ActividadCatalogo   = require('../../Proyectos/models/actividadCatalogo.model');
const AsignacionActividad = require('../../Proyectos/models/asignacionActividad.model');
const Subproyecto         = require('../../Proyectos/models/subproyecto.model');
const { ApiError }        = require('../../middlewares/errorHandler');

const validateSubproyecto = async (subproyectoId) => {
  const sub = await Subproyecto.findById(subproyectoId);
  if (!sub) throw new ApiError(404, 'Subproyecto no encontrado');
  if (sub.estado !== 'ACTIVO') throw new ApiError(400, 'El subproyecto no está activo');
  return sub;
};

const validateFinca = async (fincaId) => {
  const finca = await Finca.findById(fincaId);
  if (!finca) throw new ApiError(404, 'Finca no encontrada');
  if (!finca.activa) throw new ApiError(400, 'La finca seleccionada está inactiva');
  return finca;
};

const validateLotes = async (loteIds, fincaId) => {
  if (!loteIds || loteIds.length === 0)
    throw new ApiError(400, 'Debe seleccionar al menos un lote');
  const lotes = await Lote.find({ _id: { $in: loteIds }, finca: fincaId, activo: true });
  if (lotes.length !== loteIds.length)
    throw new ApiError(400, 'Uno o más lotes no existen, están inactivos o no pertenecen a la finca');
  return lotes;
};

const validateActividadesConCantidad = async (actividades, subproyectoId) => {
  if (!actividades || actividades.length === 0)
    throw new ApiError(400, 'Debe incluir al menos una actividad');

  const actividadIds = actividades.map(a => a.actividad);
  const catalogos = await ActividadCatalogo.find({ _id: { $in: actividadIds }, activa: true });
  if (catalogos.length !== actividadIds.length)
    throw new ApiError(400, 'Una o más actividades no existen o están inactivas');

  for (const item of actividades) {
    const cantidad = Number(item.cantidad);
    const precio   = Number(item.precio_unitario);
    if (!cantidad || cantidad <= 0)
      throw new ApiError(400, `La cantidad debe ser mayor a 0 para la actividad ${item.actividad}`);
    if (precio < 0)
      throw new ApiError(400, `El precio no puede ser negativo para la actividad ${item.actividad}`);

    const asignaciones = await AsignacionActividad.find({
      subproyecto: subproyectoId,
      estado: { $ne: 'CANCELADA' },
    }).populate({ path: 'actividad_proyecto', match: { actividad: item.actividad }, select: 'actividad cantidad_total' });

    const asignacionValida = asignaciones.find(a => a.actividad_proyecto !== null);
    if (!asignacionValida) {
      const cat = catalogos.find(c => c._id.toString() === item.actividad.toString());
      throw new ApiError(400, `La actividad "${cat?.nombre ?? item.actividad}" no está asignada a este subproyecto.`);
    }

    const contratosActivos = await Contrato.find({
      subproyecto: subproyectoId,
      estado: { $in: ['BORRADOR', 'ACTIVO'] },
      'actividades.asignacion_subproyecto': asignacionValida._id,
    });

    const cantidadEnContratos = contratosActivos.reduce((sum, c) => {
      const act = c.actividades.find(a => a.asignacion_subproyecto?.toString() === asignacionValida._id.toString());
      return sum + (act ? Number(act.cantidad) : 0);
    }, 0);

    const cantidadDisponible = asignacionValida.cantidad_asignada - cantidadEnContratos;
    if (cantidad > cantidadDisponible) {
      const cat = catalogos.find(c => c._id.toString() === item.actividad.toString());
      throw new ApiError(400,
        `Actividad "${cat?.nombre ?? item.actividad}": cantidad solicitada (${cantidad}) supera la disponible (${cantidadDisponible.toFixed(2)}).`
      );
    }
    item._asignacion_id = asignacionValida._id;
  }
  return actividades;
};

const validateActividadesConCantidadUpdate = async (actividades, subproyectoId, contratoExcluidoId) => {
  if (!actividades || actividades.length === 0)
    throw new ApiError(400, 'Debe incluir al menos una actividad');

  const actividadIds = actividades.map(a => a.actividad);
  const catalogos = await ActividadCatalogo.find({ _id: { $in: actividadIds }, activa: true });
  if (catalogos.length !== actividadIds.length)
    throw new ApiError(400, 'Una o más actividades no existen o están inactivas');

  for (const item of actividades) {
    const cantidad = Number(item.cantidad);
    const precio   = Number(item.precio_unitario);
    if (!cantidad || cantidad <= 0)
      throw new ApiError(400, `La cantidad debe ser mayor a 0 para la actividad ${item.actividad}`);
    if (precio < 0)
      throw new ApiError(400, `El precio no puede ser negativo`);

    const asignaciones = await AsignacionActividad.find({
      subproyecto: subproyectoId,
      estado: { $ne: 'CANCELADA' },
    }).populate({ path: 'actividad_proyecto', match: { actividad: item.actividad }, select: 'actividad cantidad_total' });

    const asignacionValida = asignaciones.find(a => a.actividad_proyecto !== null);
    if (!asignacionValida) {
      const cat = catalogos.find(c => c._id.toString() === item.actividad.toString());
      throw new ApiError(400, `La actividad "${cat?.nombre ?? item.actividad}" no está asignada a este subproyecto.`);
    }

    const contratosActivos = await Contrato.find({
      subproyecto: subproyectoId,
      estado: { $in: ['BORRADOR', 'ACTIVO'] },
      'actividades.asignacion_subproyecto': asignacionValida._id,
      _id: { $ne: contratoExcluidoId },
    });

    const cantidadEnOtros = contratosActivos.reduce((sum, c) => {
      const act = c.actividades.find(a => a.asignacion_subproyecto?.toString() === asignacionValida._id.toString());
      return sum + (act ? Number(act.cantidad) : 0);
    }, 0);

    const cantidadDisponible = asignacionValida.cantidad_asignada - cantidadEnOtros;
    if (cantidad > cantidadDisponible) {
      const cat = catalogos.find(c => c._id.toString() === item.actividad.toString());
      throw new ApiError(400,
        `Actividad "${cat?.nombre ?? item.actividad}": cantidad (${cantidad}) supera la disponible (${cantidadDisponible.toFixed(2)}).`
      );
    }
    item._asignacion_id = asignacionValida._id;
  }
  return actividades;
};

// ── Valida array de cuadrillas ────────────────────────────────────
const validateCuadrillas = async (cuadrillaIds) => {
  if (!cuadrillaIds || cuadrillaIds.length === 0)
    throw new ApiError(400, 'Debe asignar al menos una cuadrilla');

  const cuadrillas = await Cuadrilla.find({ _id: { $in: cuadrillaIds } });
  if (cuadrillas.length !== cuadrillaIds.length)
    throw new ApiError(404, 'Una o más cuadrillas no fueron encontradas');

  const inactiva = cuadrillas.find(c => !c.activa);
  if (inactiva)
    throw new ApiError(400, `La cuadrilla "${inactiva.nombre}" está inactiva`);

  return cuadrillas;
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
  validateCuadrillas,
  validateContratoExists,
  validateCodigoUnico,
};