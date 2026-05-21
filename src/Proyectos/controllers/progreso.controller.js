/**
 * progreso.controller.js
 * Ruta: src/Proyectos/controllers/progreso.controller.js
 *
 * ✅ ENDPOINTS UNIFICADOS PARA OBTENER PROGRESO
 * 
 * GET /api/v1/progreso/proyecto/:proyectoId
 *   ├─ Retorna: % Proyecto + desglose de Subproyectos
 *   └─ Cada Subproyecto incluye sus Contratos
 *
 * GET /api/v1/progreso/subproyecto/:subproyectoId
 *   └─ Retorna: % Subproyecto + desglose de Contratos
 *
 * GET /api/v1/progreso/contrato/:contratoId
 *   └─ Retorna: % Contrato + desglose de Programaciones
 */

const Proyecto = require('../models/proyecto.model');
const Subproyecto = require('../models/subproyecto.model');
const Contrato = require('../../Contratos/models/contrato.model');
const Programacion = require('../models/programacion.model');
const RegistroDiarioProgramacion = require('../models/registroDiarioProgramacion.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');
const progresoService = require('../services/progreso.service');

/**
 * GET /api/v1/progreso/proyecto/:proyectoId
 * Obtener progreso UNIFICADO del Proyecto
 */
const getProgresoProyecto = asyncHandler(async (req, res) => {
  const { proyectoId } = req.params;

  const proyecto = await Proyecto.findById(proyectoId).lean();
  if (!proyecto) {
    throw new ApiError(404, 'Proyecto no encontrado');
  }

  // Obtener todos los subproyectos
  const subproyectos = await Subproyecto.find({
    proyecto_id: proyectoId
  }).lean();

  // Construir desglose de subproyectos
  const subproyectosDesglose = await Promise.all(
    subproyectos.map(async (sub) => {
      // Obtener contratos del subproyecto
      const contratos = await Contrato.find({
        subproyecto: sub._id
      }).lean();

      // Construir desglose de contratos
      const contratosDesglose = await Promise.all(
        contratos.map(async (contrato) => {
          // Obtener programaciones del contrato
          const programaciones = await Programacion.find({
            'contrato.codigo': contrato.codigo
          }).lean();

          // Calcular % y estado de cada programación
          const programacionesDesglose = await Promise.all(
            programaciones.map(async (prog) => {
              const registros = await RegistroDiarioProgramacion.find({
                programacion: prog._id
              }).lean();

              const cantidadEjecutada = registros.reduce((sum, r) => sum + (r.cantidad_ejecutada || 0), 0);
              const cantidadProyectada = prog.cantidad_proyectada || 1;
              const porcentaje = Math.min(100, Math.round((cantidadEjecutada / cantidadProyectada) * 100));

              return {
                _id: prog._id,
                nombre: prog.actividad?.nombre || 'Sin nombre',
                cantidad_proyectada: cantidadProyectada,
                cantidad_ejecutada: cantidadEjecutada,
                porcentaje,
                estado: prog.estado || 'ACTIVA',
                registros_diarios: registros.length,
              };
            })
          );

          // Calcular % del contrato
          const totalEjecutado = programacionesDesglose.reduce((s, p) => s + p.cantidad_ejecutada, 0);
          const totalProyectado = programacionesDesglose.reduce((s, p) => s + p.cantidad_proyectada, 0);
          const porcentaje = totalProyectado > 0
            ? Math.round((totalEjecutado / totalProyectado) * 100)
            : 0;

          return {
            _id: contrato._id,
            codigo: contrato.codigo,
            porcentaje,
            cantidad_ejecutada: totalEjecutado,
            cantidad_proyectada: totalProyectado,
            total_programaciones: programacionesDesglose.length,
            estado: contrato.estado || 'ACTIVO',
            programaciones: programacionesDesglose,
          };
        })
      );

      // Calcular % del subproyecto
      const totalEjecutado = contratosDesglose.reduce((s, c) => s + c.cantidad_ejecutada, 0);
      const totalProyectado = contratosDesglose.reduce((s, c) => s + c.cantidad_proyectada, 0);
      const porcentaje = totalProyectado > 0
        ? Math.round((totalEjecutado / totalProyectado) * 100)
        : 0;

      return {
        _id: sub._id,
        codigo: sub.codigo,
        nombre: sub.nombre,
        porcentaje,
        cantidad_ejecutada: totalEjecutado,
        cantidad_proyectada: totalProyectado,
        total_contratos: contratosDesglose.length,
        estado: sub.estado || 'ACTIVO',
        contratos: contratosDesglose,
      };
    })
  );

  // Calcular % del proyecto
  const totalEjecutado = subproyectosDesglose.reduce((s, sp) => s + sp.cantidad_ejecutada, 0);
  const totalProyectado = subproyectosDesglose.reduce((s, sp) => s + sp.cantidad_proyectada, 0);
  const porcentajeProyecto = totalProyectado > 0
    ? Math.round((totalEjecutado / totalProyectado) * 100)
    : 0;

  res.status(200).json({
    success: true,
    data: {
      _id: proyecto._id,
      codigo: proyecto.codigo,
      nombre: proyecto.nombre,
      porcentaje: porcentajeProyecto,
      cantidad_ejecutada_total: totalEjecutado,
      cantidad_proyectada_total: totalProyectado,
      total_subproyectos: subproyectosDesglose.length,
      estado: proyecto.estado || 'ACTIVO',
      subproyectos: subproyectosDesglose,
    }
  });
});

/**
 * GET /api/v1/progreso/subproyecto/:subproyectoId
 * Obtener progreso UNIFICADO del Subproyecto
 */
const getProgresoSubproyecto = asyncHandler(async (req, res) => {
  const { subproyectoId } = req.params;

  const subproyecto = await Subproyecto.findById(subproyectoId).lean();
  if (!subproyecto) {
    throw new ApiError(404, 'Subproyecto no encontrado');
  }

  // Obtener todos los contratos del subproyecto
  const contratos = await Contrato.find({
    subproyecto: subproyectoId
  }).lean();

  // Construir desglose de contratos
  const contratosDesglose = await Promise.all(
    contratos.map(async (contrato) => {
      // Obtener programaciones del contrato
      const programaciones = await Programacion.find({
        'contrato.codigo': contrato.codigo
      }).lean();

      // Calcular % y estado de cada programación
      const programacionesDesglose = await Promise.all(
        programaciones.map(async (prog) => {
          const registros = await RegistroDiarioProgramacion.find({
            programacion: prog._id
          }).lean();

          const cantidadEjecutada = registros.reduce((sum, r) => sum + (r.cantidad_ejecutada || 0), 0);
          const cantidadProyectada = prog.cantidad_proyectada || 1;
          const porcentaje = Math.min(100, Math.round((cantidadEjecutada / cantidadProyectada) * 100));

          return {
            _id: prog._id,
            nombre: prog.actividad?.nombre || 'Sin nombre',
            cantidad_proyectada: cantidadProyectada,
            cantidad_ejecutada: cantidadEjecutada,
            porcentaje,
            estado: prog.estado || 'ACTIVA',
            registros_diarios: registros.length,
          };
        })
      );

      // Calcular % del contrato
      const totalEjecutado = programacionesDesglose.reduce((s, p) => s + p.cantidad_ejecutada, 0);
      const totalProyectado = programacionesDesglose.reduce((s, p) => s + p.cantidad_proyectada, 0);
      const porcentaje = totalProyectado > 0
        ? Math.round((totalEjecutado / totalProyectado) * 100)
        : 0;

      return {
        _id: contrato._id,
        codigo: contrato.codigo,
        porcentaje,
        cantidad_ejecutada: totalEjecutado,
        cantidad_proyectada: totalProyectado,
        total_programaciones: programacionesDesglose.length,
        estado: contrato.estado || 'ACTIVO',
        programaciones: programacionesDesglose,
      };
    })
  );

  // Calcular % del subproyecto
  const totalEjecutado = contratosDesglose.reduce((s, c) => s + c.cantidad_ejecutada, 0);
  const totalProyectado = contratosDesglose.reduce((s, c) => s + c.cantidad_proyectada, 0);
  const porcentaje = totalProyectado > 0
    ? Math.round((totalEjecutado / totalProyectado) * 100)
    : 0;

  res.status(200).json({
    success: true,
    data: {
      _id: subproyecto._id,
      codigo: subproyecto.codigo,
      nombre: subproyecto.nombre,
      porcentaje,
      cantidad_ejecutada: totalEjecutado,
      cantidad_proyectada: totalProyectado,
      total_contratos: contratosDesglose.length,
      estado: subproyecto.estado || 'ACTIVO',
      contratos: contratosDesglose,
    }
  });
});

/**
 * GET /api/v1/progreso/contrato/:contratoId
 * Obtener progreso UNIFICADO del Contrato
 */
const getProgresoContrato = asyncHandler(async (req, res) => {
  const { contratoId } = req.params;

  const contrato = await Contrato.findById(contratoId).lean();
  if (!contrato) {
    throw new ApiError(404, 'Contrato no encontrado');
  }

  // Obtener programaciones del contrato
  const programaciones = await Programacion.find({
    'contrato.codigo': contrato.codigo
  }).lean();

  // Calcular % y estado de cada programación
  const programacionesDesglose = await Promise.all(
    programaciones.map(async (prog) => {
      const registros = await RegistroDiarioProgramacion.find({
        programacion: prog._id
      }).lean();

      const cantidadEjecutada = registros.reduce((sum, r) => sum + (r.cantidad_ejecutada || 0), 0);
      const cantidadProyectada = prog.cantidad_proyectada || 1;
      const porcentaje = Math.min(100, Math.round((cantidadEjecutada / cantidadProyectada) * 100));

      return {
        _id: prog._id,
        nombre: prog.actividad?.nombre || 'Sin nombre',
        cantidad_proyectada: cantidadProyectada,
        cantidad_ejecutada: cantidadEjecutada,
        porcentaje,
        estado: prog.estado || 'ACTIVA',
        registros_diarios: registros.length,
      };
    })
  );

  // Calcular % del contrato
  const totalEjecutado = programacionesDesglose.reduce((s, p) => s + p.cantidad_ejecutada, 0);
  const totalProyectado = programacionesDesglose.reduce((s, p) => s + p.cantidad_proyectada, 0);
  const porcentaje = totalProyectado > 0
    ? Math.round((totalEjecutado / totalProyectado) * 100)
    : 0;

  res.status(200).json({
    success: true,
    data: {
      _id: contrato._id,
      codigo: contrato.codigo,
      nombre: contrato.nombre || contrato.codigo,
      porcentaje,
      cantidad_ejecutada: totalEjecutado,
      cantidad_proyectada: totalProyectado,
      total_programaciones: programacionesDesglose.length,
      estado: contrato.estado || 'ACTIVO',
      programaciones: programacionesDesglose,
    }
  });
});

module.exports = {
  getProgresoProyecto,
  getProgresoSubproyecto,
  getProgresoContrato,
};
