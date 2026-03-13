const Contrato  = require('../models/contrato.model');
const Persona   = require('../../Personal/models/persona.model');
const contratoService = require('../services/contrato.service');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

const POPULATE_CONTRATO = [
  { path: 'subproyecto', select: 'codigo nombre estado' },
  { path: 'finca', select: 'codigo nombre' },
  { path: 'lotes', select: 'codigo nombre area' },
  { path: 'actividades.actividad', select: 'codigo nombre categoria unidad_medida' },
  {
    path: 'cuadrillas',
    populate: [
      { path: 'supervisor', select: 'nombres apellidos num_doc' },
      { path: 'miembros.persona', select: 'nombres apellidos num_doc cargo estado' },
    ],
  },
  { path: 'creado_por', select: 'nombres apellidos' },
];

// GET /api/v1/contratos
const getContratos = asyncHandler(async (req, res) => {
  const { estado, finca, subproyecto } = req.query;
  const filter = {};
  if (estado)      filter.estado      = estado;
  if (finca)       filter.finca       = finca;
  if (subproyecto) filter.subproyecto = subproyecto;

  const contratos = await Contrato.find(filter)
    .populate(POPULATE_CONTRATO)
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: contratos.length, data: contratos });
});

// GET /api/v1/contratos/:id
const getContrato = asyncHandler(async (req, res) => {
  const contrato = await Contrato.findById(req.params.id).populate(POPULATE_CONTRATO);
  if (!contrato) throw new ApiError(404, 'Contrato no encontrado');
  res.status(200).json({ success: true, data: contrato });
});

// POST /api/v1/contratos
const createContrato = asyncHandler(async (req, res) => {
  const {
    codigo, subproyecto, finca, lotes, actividades,
    cuadrillas, fecha_inicio, fecha_fin, observaciones,
  } = req.body;

  await contratoService.validateCodigoUnico(codigo);
  await contratoService.validateSubproyecto(subproyecto);
  await contratoService.validateFinca(finca);
  await contratoService.validateLotes(lotes, finca);
  const actividadesValidadas = await contratoService.validateActividadesConCantidad(actividades, subproyecto);
  await contratoService.validateCuadrillas(cuadrillas);

  const actividadesDoc = actividadesValidadas.map(a => ({
    actividad:              a.actividad,
    asignacion_subproyecto: a._asignacion_id ?? null,
    cantidad:               Number(a.cantidad),
    precio_unitario:        Number(a.precio_unitario),
  }));

  const contrato = await Contrato.create({
    codigo,
    subproyecto,
    finca,
    lotes,
    actividades: actividadesDoc,
    cuadrillas,
    fecha_inicio,
    fecha_fin:    fecha_fin || null,
    observaciones,
    creado_por: req.user?.personaId || null,
  });

  await contrato.populate(POPULATE_CONTRATO);

  res.status(201).json({ success: true, message: 'Contrato creado exitosamente', data: contrato });
});

// PUT /api/v1/contratos/:id
const updateContrato = asyncHandler(async (req, res) => {
  const contrato = await contratoService.validateContratoExists(req.params.id);
  if (['CERRADO', 'CANCELADO'].includes(contrato.estado))
    throw new ApiError(400, `No se puede modificar un contrato en estado ${contrato.estado}`);

  const {
    codigo, subproyecto, finca, lotes, actividades,
    cuadrillas, fecha_inicio, fecha_fin, estado, observaciones,
  } = req.body;

  if (codigo && codigo.toUpperCase() !== contrato.codigo) {
    await contratoService.validateCodigoUnico(codigo, req.params.id);
    contrato.codigo = codigo.toUpperCase();
  }

  const subproyectoFinal = subproyecto || contrato.subproyecto.toString();
  if (subproyecto && subproyecto !== contrato.subproyecto.toString()) {
    await contratoService.validateSubproyecto(subproyecto);
    contrato.subproyecto = subproyecto;
  }

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
    const validadas = await contratoService.validateActividadesConCantidadUpdate(
      actividades, subproyectoFinal, req.params.id
    );
    contrato.actividades = validadas.map(a => ({
      actividad:              a.actividad,
      asignacion_subproyecto: a._asignacion_id ?? null,
      cantidad:               Number(a.cantidad),
      precio_unitario:        Number(a.precio_unitario),
    }));
  }

  if (cuadrillas) {
    await contratoService.validateCuadrillas(cuadrillas);
    contrato.cuadrillas = cuadrillas;
  }

  if (fecha_inicio)  contrato.fecha_inicio  = fecha_inicio;
  if (fecha_fin)     contrato.fecha_fin     = fecha_fin;
  if (estado)        contrato.estado        = estado;
  if (observaciones !== undefined) contrato.observaciones = observaciones;

  await contrato.save();
  await contrato.populate(POPULATE_CONTRATO);

  res.status(200).json({ success: true, message: 'Contrato actualizado exitosamente', data: contrato });
});

// DELETE /api/v1/contratos/:id
const deleteContrato = asyncHandler(async (req, res) => {
  const contrato = await contratoService.validateContratoExists(req.params.id);
  if (contrato.estado === 'CANCELADO')
    throw new ApiError(400, 'El contrato ya está cancelado');

  contrato.estado = 'CANCELADO';
  await contrato.save();

  res.status(200).json({ success: true, message: 'Contrato cancelado', data: { id: contrato._id, estado: contrato.estado } });
});

// GET /api/v1/contratos/subproyecto/:subproyectoId/actividades-disponibles
const getActividadesDisponiblesSubproyecto = asyncHandler(async (req, res) => {
  const { subproyectoId } = req.params;
  const { excludeContratoId } = req.query;

  const AsignacionActividad = require('../../Proyectos/models/asignacionActividad.model');

  const asignaciones = await AsignacionActividad.find({
    subproyecto: subproyectoId,
    estado: { $ne: 'CANCELADA' },
  }).populate({
    path: 'actividad_proyecto',
    populate: { path: 'actividad', select: 'nombre codigo unidad_medida categoria' },
  });

  const resultado = await Promise.all(
    asignaciones.map(async (asig) => {
      const query = {
        subproyecto: subproyectoId,
        estado: { $in: ['BORRADOR', 'ACTIVO'] },
        'actividades.asignacion_subproyecto': asig._id,
      };
      if (excludeContratoId) query._id = { $ne: excludeContratoId };

      const contratosConEsta = await Contrato.find(query);
      const cantidadEnContratos = contratosConEsta.reduce((sum, c) => {
        const act = c.actividades.find(a => a.asignacion_subproyecto?.toString() === asig._id.toString());
        return sum + (act ? Number(act.cantidad) : 0);
      }, 0);

      return {
        asignacion_id:                   asig._id,
        actividad:                       asig.actividad_proyecto?.actividad,
        cantidad_asignada_subproyecto:   asig.cantidad_asignada,
        cantidad_en_contratos:           cantidadEnContratos,
        cantidad_disponible:             Math.max(0, asig.cantidad_asignada - cantidadEnContratos),
        precio_unitario_referencia:      asig.actividad_proyecto?.precio_unitario ?? 0,
        unidad:                          asig.actividad_proyecto?.actividad?.unidad_medida ?? '',
      };
    })
  );

  res.status(200).json({ success: true, count: resultado.length, data: resultado });
});

module.exports = {
  getContratos,
  getContrato,
  createContrato,
  updateContrato,
  deleteContrato,
  getActividadesDisponiblesSubproyecto,
};