const Cuadrilla = require('../models/cuadrilla.model');
// ✅ REMOVIDO: ya no se importa Persona ni cuadrillaService porque
//    no se hacen lookups a BD de personas/núcleos (vienen de API externa)
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

// ─────────────────────────────────────────────
// Helper: valida que un objeto persona tenga los campos mínimos
// ─────────────────────────────────────────────
const validarPersonaObj = (persona, campo = 'persona') => {
  if (!persona || typeof persona !== 'object') {
    throw new ApiError(400, `El campo '${campo}' debe ser un objeto`);
  }
  if (!persona.cc || String(persona.cc).trim() === '') {
    throw new ApiError(400, `El campo '${campo}.cc' (cédula) es obligatorio`);
  }
  if (!persona.name || String(persona.name).trim() === '') {
    throw new ApiError(400, `El campo '${campo}.name' (nombre) es obligatorio`);
  }
};

// ─────────────────────────────────────────────
// Helper: valida que un objeto nucleo tenga los campos mínimos
// ─────────────────────────────────────────────
const validarNucleoObj = (nucleo) => {
  if (!nucleo || typeof nucleo !== 'object') {
    throw new ApiError(400, "El campo 'nucleo' debe ser un objeto");
  }
  if (!nucleo.id || String(nucleo.id).trim() === '') {
    throw new ApiError(400, "El campo 'nucleo.id' es obligatorio");
  }
  if (!nucleo.nombre || String(nucleo.nombre).trim() === '') {
    throw new ApiError(400, "El campo 'nucleo.nombre' es obligatorio");
  }
};

/**
 * @desc    Obtener todas las cuadrillas
 * @route   GET /api/v1/cuadrillas
 * @access  Private
 */
const getCuadrillas = asyncHandler(async (req, res) => {
  const { activa, supervisorCc, nucleoId } = req.query;

  const filter = {};
  if (activa !== undefined) filter.activa = activa === 'true';
  // ✅ CAMBIADO: filtro por CC del supervisor embebido en lugar de ObjectId
  if (supervisorCc) filter['supervisor.cc'] = supervisorCc;
  // ✅ CAMBIADO: filtro por id del nucleo embebido en lugar de ObjectId
  if (nucleoId) filter['nucleo.id'] = nucleoId;

  // ✅ REMOVIDO: .populate('supervisor'), .populate('nucleo'), .populate('miembros.persona')
  //    ya no son necesarios porque los datos están embebidos
  const cuadrillas = await Cuadrilla.find(filter).sort({ nombre: 1 });

  res.status(200).json({
    success: true,
    count: cuadrillas.length,
    data: cuadrillas
  });
});

/**
 * @desc    Obtener una cuadrilla por ID
 * @route   GET /api/v1/cuadrillas/:id
 * @access  Private
 */
const getCuadrilla = asyncHandler(async (req, res) => {
  // ✅ REMOVIDO: .populate() ya no es necesario
  const cuadrilla = await Cuadrilla.findById(req.params.id);

  if (!cuadrilla) {
    throw new ApiError(404, 'Cuadrilla no encontrada');
  }

  res.status(200).json({
    success: true,
    data: cuadrilla
  });
});

/**
 * @desc    Crear una cuadrilla
 * @route   POST /api/v1/cuadrillas
 * @access  Private (Admin, Jefe Operaciones)
 *
 * Body esperado:
 * {
 *   codigo: "CUA-001",                          // opcional, se autogenera
 *   nombre: "Cuadrilla Norte",
 *   supervisor: { cc, name, cargo, nombrefinca, proceso },
 *   nucleo: { id, nombre },                     // opcional
 *   observaciones: "...",                       // opcional
 *   miembros: [                                 // opcional
 *     { cc, name, cargo, nombrefinca, proceso },
 *     ...
 *   ]
 * }
 */
const createCuadrilla = asyncHandler(async (req, res) => {
  const { codigo, nombre, supervisor, nucleo, observaciones, miembros } = req.body;

  // ✅ CAMBIADO: en lugar de validateSupervisor() que buscaba en BD,
  //    ahora solo validamos que el objeto tenga los campos mínimos
  validarPersonaObj(supervisor, 'supervisor');

  // Validar nucleo si viene
  if (nucleo) validarNucleoObj(nucleo);

  // ✅ CAMBIADO: en lugar de iterar IDs y hacer validatePersona() en BD,
  //    ahora iteramos objetos y validamos sus campos mínimos
  let miembrosFormateados = [];
  if (Array.isArray(miembros) && miembros.length > 0) {
    const ccsVistas = new Set();

    for (const p of miembros) {
      validarPersonaObj(p, 'miembros[]');

      if (ccsVistas.has(p.cc)) {
        throw new ApiError(400, `La persona con CC ${p.cc} está duplicada en el array de miembros`);
      }
      ccsVistas.add(p.cc);

      miembrosFormateados.push({
        persona: {
          cc: String(p.cc).trim(),
          name: String(p.name).trim(),
          cargo: p.cargo ? String(p.cargo).trim() : null,
          nombrefinca: p.nombrefinca ? String(p.nombrefinca).trim() : null,
          proceso: p.proceso ? String(p.proceso).trim() : null
        },
        fecha_ingreso: new Date(),
        activo: true
      });
    }
  }

  const cuadrillaData = {
    codigo,
    nombre,
    supervisor: {
      cc: String(supervisor.cc).trim(),
      name: String(supervisor.name).trim(),
      cargo: supervisor.cargo ? String(supervisor.cargo).trim() : null,
      nombrefinca: supervisor.nombrefinca ? String(supervisor.nombrefinca).trim() : null,
      proceso: supervisor.proceso ? String(supervisor.proceso).trim() : null
    },
    nucleo: nucleo
      ? { id: String(nucleo.id).trim(), nombre: String(nucleo.nombre).trim() }
      : null,
    observaciones,
    miembros: miembrosFormateados
  };

  const cuadrilla = await Cuadrilla.create(cuadrillaData);
  // ✅ REMOVIDO: await cuadrilla.populate(...)

  res.status(201).json({
    success: true,
    message: 'Cuadrilla creada exitosamente',
    data: cuadrilla
  });
});

/**
 * @desc    Actualizar una cuadrilla
 * @route   PUT /api/v1/cuadrillas/:id
 * @access  Private (Admin, Jefe Operaciones)
 *
 * Body esperado (todos opcionales):
 * {
 *   codigo, nombre, activa, observaciones,
 *   supervisor: { cc, name, cargo, nombrefinca, proceso },
 *   nucleo: { id, nombre }   (null para desasignar)
 * }
 */
const updateCuadrilla = asyncHandler(async (req, res) => {
  // ✅ CAMBIADO: en lugar de cuadrillaService.validateCuadrillaExists()
  //    buscamos directamente con findById (mismo resultado, sin depender del service)
  const cuadrilla = await Cuadrilla.findById(req.params.id);
  if (!cuadrilla) {
    throw new ApiError(404, 'Cuadrilla no encontrada');
  }

  const { codigo, nombre, supervisor, nucleo, activa, observaciones } = req.body;

  // Verificar código duplicado si cambió
  if (codigo && codigo !== cuadrilla.codigo) {
    const existeCodigo = await Cuadrilla.findOne({
      codigo: codigo.toUpperCase(),
      _id: { $ne: req.params.id }
    });
    if (existeCodigo) {
      throw new ApiError(409, 'El código de cuadrilla ya existe');
    }
    cuadrilla.codigo = codigo.toUpperCase();
  }

  if (nombre !== undefined) cuadrilla.nombre = nombre;
  if (activa !== undefined) cuadrilla.activa = activa;
  if (observaciones !== undefined) cuadrilla.observaciones = observaciones;

  // ✅ CAMBIADO: supervisor llega como objeto, ya no como ObjectId
  if (supervisor) {
    validarPersonaObj(supervisor, 'supervisor');
    cuadrilla.supervisor = {
      cc: String(supervisor.cc).trim(),
      name: String(supervisor.name).trim(),
      cargo: supervisor.cargo ? String(supervisor.cargo).trim() : null,
      nombrefinca: supervisor.nombrefinca ? String(supervisor.nombrefinca).trim() : null,
      proceso: supervisor.proceso ? String(supervisor.proceso).trim() : null
    };
  }

  // ✅ CAMBIADO: nucleo llega como objeto (o null para desasignar)
  if (nucleo !== undefined) {
    if (nucleo === null) {
      cuadrilla.nucleo = null;
    } else {
      validarNucleoObj(nucleo);
      cuadrilla.nucleo = {
        id: String(nucleo.id).trim(),
        nombre: String(nucleo.nombre).trim()
      };
    }
  }

  await cuadrilla.save();
  // ✅ REMOVIDO: await cuadrilla.populate(...)

  res.status(200).json({
    success: true,
    message: 'Cuadrilla actualizada exitosamente',
    data: cuadrilla
  });
});

/**
 * @desc    Agregar miembro a cuadrilla
 * @route   POST /api/v1/cuadrillas/:id/miembros
 * @access  Private (Admin, Jefe Operaciones, Supervisor)
 *
 * Body esperado:
 * {
 *   persona: { cc, name, cargo, nombrefinca, proceso }
 * }
 */
const agregarMiembros = asyncHandler(async (req, res) => {
  // ✅ CAMBIADO: antes recibía { personaId } (ObjectId), ahora recibe { persona } (objeto)
  const { persona } = req.body;

  validarPersonaObj(persona, 'persona');

  const cuadrilla = await Cuadrilla.findById(req.params.id);
  if (!cuadrilla) {
    throw new ApiError(404, 'Cuadrilla no encontrada');
  }

  if (!cuadrilla.activa) {
    throw new ApiError(400, 'No se pueden agregar miembros a una cuadrilla inactiva');
  }

  // ✅ CAMBIADO: verificar duplicado por CC en lugar de ObjectId
  const yaMiembro = cuadrilla.miembros.some(
    m => m.persona.cc === String(persona.cc).trim() && m.activo
  );
  if (yaMiembro) {
    throw new ApiError(409, `La persona con CC ${persona.cc} ya es miembro activo de esta cuadrilla`);
  }

  // ✅ CAMBIADO: push del objeto persona en lugar del ObjectId
  cuadrilla.miembros.push({
    persona: {
      cc: String(persona.cc).trim(),
      name: String(persona.name).trim(),
      cargo: persona.cargo ? String(persona.cargo).trim() : null,
      nombrefinca: persona.nombrefinca ? String(persona.nombrefinca).trim() : null,
      proceso: persona.proceso ? String(persona.proceso).trim() : null
    },
    fecha_ingreso: new Date(),
    activo: true
  });

  await cuadrilla.save();
  // ✅ REMOVIDO: await cuadrilla.populate(...)

  res.status(200).json({
    success: true,
    message: 'Miembro agregado exitosamente',
    data: cuadrilla
  });
});

/**
 * @desc    Remover miembro de una cuadrilla (soft delete)
 * @route   DELETE /api/v1/cuadrillas/:id/miembros/:cc
 * @access  Private (Admin, Jefe Operaciones, Supervisor)
 *
 * NOTA: el param `:personaId` en la ruta pasa a llamarse `:cc`
 *       → actualizar cuadrilla.routes.js en consecuencia
 */
const removerMiembro = asyncHandler(async (req, res) => {
  const cuadrilla = await Cuadrilla.findById(req.params.id);
  if (!cuadrilla) {
    throw new ApiError(404, 'Cuadrilla no encontrada');
  }

  // ✅ CAMBIADO: busca por CC (req.params.cc) en lugar de ObjectId (req.params.personaId)
  const cc = req.params.cc;
  const miembro = cuadrilla.miembros.find(m => m.persona.cc === cc && m.activo);

  if (!miembro) {
    throw new ApiError(404, `No se encontró un miembro activo con CC ${cc} en esta cuadrilla`);
  }

  miembro.activo = false;
  miembro.fecha_salida = new Date();

  await cuadrilla.save();
  // ✅ REMOVIDO: await cuadrilla.populate(...)

  res.status(200).json({
    success: true,
    message: 'Miembro removido exitosamente',
    data: cuadrilla
  });
});

/**
 * @desc    Desactivar una cuadrilla (soft delete)
 * @route   DELETE /api/v1/cuadrillas/:id
 * @access  Private (Admin, Jefe Operaciones)
 */
const deleteCuadrilla = asyncHandler(async (req, res) => {
  // ✅ CAMBIADO: reemplaza cuadrillaService.validateCuadrillaExists()
  const cuadrilla = await Cuadrilla.findById(req.params.id);
  if (!cuadrilla) {
    throw new ApiError(404, 'Cuadrilla no encontrada');
  }

  if (!cuadrilla.activa) {
    throw new ApiError(400, 'La cuadrilla ya está desactivada');
  }

  cuadrilla.activa = false;
  await cuadrilla.save();

  res.status(200).json({
    success: true,
    message: 'Cuadrilla desactivada exitosamente',
    data: cuadrilla
  });
});

module.exports = {
  getCuadrillas,
  getCuadrilla,
  createCuadrilla,
  updateCuadrilla,
  agregarMiembros,
  removerMiembro,
  deleteCuadrilla
};