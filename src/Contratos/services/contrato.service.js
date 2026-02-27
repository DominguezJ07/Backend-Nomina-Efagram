const Contrato  = require('../models/contrato.model');
const Finca     = require('../../Territorial/models/finca.model');
const Lote      = require('../../Territorial/models/lote.model');
const Cuadrilla = require('../../Personal/models/cuadrilla.model');
const ActividadCatalogo = require('../../Proyectos/models/actividadCatalogo.model');
const { ApiError } = require('../../middlewares/errorHandler');

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

  const lotes = await Lote.find({
    _id: { $in: loteIds },
    finca: fincaId,
    activo: true,
  });

  if (lotes.length !== loteIds.length) {
    throw new ApiError(
      400,
      'Uno o más lotes no existen, están inactivos, o no pertenecen a la finca seleccionada'
    );
  }
  return lotes;
};

// ── Valida que las actividades existan y estén activas ─────────────
const validateActividades = async (actividadIds) => {
  if (!actividadIds || actividadIds.length === 0) {
    throw new ApiError(400, 'Debe seleccionar al menos una actividad');
  }

  const actividades = await ActividadCatalogo.find({
    _id: { $in: actividadIds },
    activa: true,
  });

  if (actividades.length !== actividadIds.length) {
    throw new ApiError(
      400,
      'Una o más actividades no existen o están inactivas'
    );
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

// ── Valida que el contrato exista ─────────────────────────────────
const validateContratoExists = async (contratoId) => {
  const contrato = await Contrato.findById(contratoId);
  if (!contrato) throw new ApiError(404, 'Contrato no encontrado');
  return contrato;
};

// ── Valida que el código no esté duplicado (excluyendo id propio) ──
const validateCodigoUnico = async (codigo, excludeId = null) => {
  const query = { codigo: codigo.toUpperCase() };
  if (excludeId) query._id = { $ne: excludeId };

  const existe = await Contrato.findOne(query);
  if (existe) throw new ApiError(409, `Ya existe un contrato con el código "${codigo}"`);
};

module.exports = {
  validateFinca,
  validateLotes,
  validateActividades,
  validateCuadrilla,
  validateContratoExists,
  validateCodigoUnico,
};