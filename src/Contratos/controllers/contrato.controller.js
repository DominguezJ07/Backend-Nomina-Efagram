const Contrato  = require('../models/contrato.model');
const Persona   = require('../../Personal/models/persona.model');
const contratoService = require('../services/contrato.service');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

// ── Populate reutilizable ─────────────────────────────────────────
const POPULATE_CONTRATO = [
  { path: 'finca', select: 'codigo nombre' },
  { path: 'lotes', select: 'codigo nombre area' },
  { path: 'actividades', select: 'codigo nombre categoria unidad_medida' },
  {
    path: 'cuadrilla',
    populate: [
      { path: 'supervisor', select: 'nombres apellidos num_doc' },
      { path: 'miembros.persona', select: 'nombres apellidos num_doc cargo estado' },
    ],
  },
  { path: 'creado_por', select: 'nombres apellidos' },
];

// ────────────────────────────────────────────────────────────────
// GET /api/v1/contratos
// ────────────────────────────────────────────────────────────────
const getContratos = asyncHandler(async (req, res) => {
  const { estado, finca, cuadrilla } = req.query;

  const filter = {};
  if (estado)    filter.estado    = estado;
  if (finca)     filter.finca     = finca;
  if (cuadrilla) filter.cuadrilla = cuadrilla;

  const contratos = await Contrato.find(filter)
    .populate(POPULATE_CONTRATO)
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: contratos.length,
    data: contratos,
  });
});

// ────────────────────────────────────────────────────────────────
// GET /api/v1/contratos/:id
// ────────────────────────────────────────────────────────────────
const getContrato = asyncHandler(async (req, res) => {
  const contrato = await Contrato.findById(req.params.id).populate(POPULATE_CONTRATO);

  if (!contrato) throw new ApiError(404, 'Contrato no encontrado');

  res.status(200).json({ success: true, data: contrato });
});

// ────────────────────────────────────────────────────────────────
// POST /api/v1/contratos
// ────────────────────────────────────────────────────────────────
const createContrato = asyncHandler(async (req, res) => {
  const { codigo, finca, lotes, actividades, cuadrilla, fecha_inicio, fecha_fin, observaciones } =
    req.body;

  // Validaciones de negocio
  await contratoService.validateCodigoUnico(codigo);
  await contratoService.validateFinca(finca);
  await contratoService.validateLotes(lotes, finca);
  await contratoService.validateActividades(actividades);
  await contratoService.validateCuadrilla(cuadrilla);

  const contrato = await Contrato.create({
    codigo,
    finca,
    lotes,
    actividades,
    cuadrilla,
    fecha_inicio,
    fecha_fin,
    observaciones,
    creado_por: req.user?.personaId || null,
  });

  await contrato.populate(POPULATE_CONTRATO);

  res.status(201).json({
    success: true,
    message: 'Contrato creado exitosamente',
    data: contrato,
  });
});

// ────────────────────────────────────────────────────────────────
// PUT /api/v1/contratos/:id
// ────────────────────────────────────────────────────────────────
const updateContrato = asyncHandler(async (req, res) => {
  const contrato = await contratoService.validateContratoExists(req.params.id);

  if (contrato.estado === 'CERRADO' || contrato.estado === 'CANCELADO') {
    throw new ApiError(400, `No se puede modificar un contrato en estado ${contrato.estado}`);
  }

  const { codigo, finca, lotes, actividades, cuadrilla, fecha_inicio, fecha_fin, estado, observaciones } =
    req.body;

  // Validar código si cambia
  if (codigo && codigo.toUpperCase() !== contrato.codigo) {
    await contratoService.validateCodigoUnico(codigo, req.params.id);
    contrato.codigo = codigo.toUpperCase();
  }

  // Validar finca si cambia (y re-validar lotes)
  const fincaFinal = finca || contrato.finca.toString();
  if (finca && finca !== contrato.finca.toString()) {
    await contratoService.validateFinca(finca);
    contrato.finca = finca;
  }

  if (lotes) {
    await contratoService.validateLotes(lotes, fincaFinal);
    contrato.lotes = lotes;
  }

  if (actividades) {
    await contratoService.validateActividades(actividades);
    contrato.actividades = actividades;
  }

  if (cuadrilla && cuadrilla !== contrato.cuadrilla.toString()) {
    await contratoService.validateCuadrilla(cuadrilla);
    contrato.cuadrilla = cuadrilla;
  }

  if (fecha_inicio)   contrato.fecha_inicio   = fecha_inicio;
  if (fecha_fin)      contrato.fecha_fin       = fecha_fin;
  if (estado)         contrato.estado          = estado;
  if (observaciones !== undefined) contrato.observaciones = observaciones;

  await contrato.save();
  await contrato.populate(POPULATE_CONTRATO);

  res.status(200).json({
    success: true,
    message: 'Contrato actualizado exitosamente',
    data: contrato,
  });
});

// ────────────────────────────────────────────────────────────────
// DELETE /api/v1/contratos/:id  (cancelar, no eliminar)
// ────────────────────────────────────────────────────────────────
const deleteContrato = asyncHandler(async (req, res) => {
  const contrato = await contratoService.validateContratoExists(req.params.id);

  if (contrato.estado === 'CANCELADO') {
    throw new ApiError(400, 'El contrato ya está cancelado');
  }

  contrato.estado = 'CANCELADO';
  await contrato.save();

  res.status(200).json({
    success: true,
    message: 'Contrato cancelado exitosamente',
    data: { id: contrato._id, estado: contrato.estado },
  });
});

// ────────────────────────────────────────────────────────────────
// GET /api/v1/contratos/:id/trabajadores-disponibles
// Devuelve personas activas que NO están en la cuadrilla del contrato.
// Acepta ?q=texto para buscar por cédula o nombre.
// ────────────────────────────────────────────────────────────────
const getTrabajadoresDisponibles = asyncHandler(async (req, res) => {
  const contrato = await Contrato.findById(req.params.id).populate({
    path: 'cuadrilla',
    select: 'miembros',
  });

  if (!contrato) throw new ApiError(404, 'Contrato no encontrado');

  // IDs de personas ya en la cuadrilla (activas)
  const miembrosActivos = (contrato.cuadrilla?.miembros || [])
    .filter((m) => m.activo)
    .map((m) => m.persona.toString());

  const { q } = req.query;

  const filter = {
    estado: 'ACTIVO',
    _id: { $nin: miembrosActivos },
  };

  // Búsqueda por cédula o nombre (parcial, case-insensitive)
  if (q && q.trim()) {
    const regex = new RegExp(q.trim(), 'i');
    filter.$or = [
      { num_doc: regex },
      { nombres: regex },
      { apellidos: regex },
    ];
  }

  const personas = await Persona.find(filter)
    .select('nombres apellidos num_doc tipo_doc cargo telefono estado')
    .sort({ apellidos: 1 })
    .limit(50);

  res.status(200).json({
    success: true,
    count: personas.length,
    data: personas,
  });
});

module.exports = {
  getContratos,
  getContrato,
  createContrato,
  updateContrato,
  deleteContrato,
  getTrabajadoresDisponibles,
};