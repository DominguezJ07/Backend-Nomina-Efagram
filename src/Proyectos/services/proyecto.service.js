/**
 * proyecto.service.js
 * Ruta: src/Proyectos/services/proyecto.service.js
 *
 * Lógica de negocio compleja del módulo de Proyectos.
 * Los controllers delegan aquí todo lo que no sea
 * "recibir request / enviar response".
 */

const Proyecto              = require('../models/proyecto.model');
const ProyectoActividadLote = require('../models/proyectoActividadLote.model');
const { ApiError }          = require('../../middlewares/errorHandler');
const { ESTADOS_PROYECTO, ESTADOS_PAL } = require('../../config/constants');

class ProyectoService {

  // ──────────────────────────────────────────────────────────────────
  // VALIDACIONES BÁSICAS
  // ──────────────────────────────────────────────────────────────────

  /**
   * Verifica que un proyecto exista por ID.
   * Lanza ApiError 404 si no existe.
   * @param {string} proyectoId
   * @returns {Promise<Document>} documento Mongoose del proyecto
   */
  async validateProyectoExists(proyectoId) {
    const proyecto = await Proyecto.findById(proyectoId);
    if (!proyecto) {
      throw new ApiError(404, 'Proyecto no encontrado');
    }
    return proyecto;
  }

  // ──────────────────────────────────────────────────────────────────
  // CIERRE DE PROYECTO
  // ──────────────────────────────────────────────────────────────────

  /**
   * Verifica si un proyecto puede cerrarse.
   * Regla: no puede cerrarse si tiene PALs que no alcanzaron la meta mínima.
   *
   * ✅ SIN populate — actividad y lote ya son objetos embebidos en PAL
   *
   * @param {string} proyectoId
   * @returns {{ puede: boolean, palsPendientes: number, pals: Array }}
   */
  async puedeObtenerProyecto(proyectoId) {
    const palsIncumplidos = await ProyectoActividadLote.find({
      proyecto: proyectoId,
      estado:   { $nin: [ESTADOS_PAL.CUMPLIDA, ESTADOS_PAL.CANCELADA] },
    }).lean();

    const palsSinCumplirMeta = palsIncumplidos.filter(
      (pal) => pal.cantidad_ejecutada < pal.meta_minima
    );

    return {
      puede:          palsSinCumplirMeta.length === 0,
      palsPendientes: palsSinCumplirMeta.length,
      pals:           palsSinCumplirMeta,
    };
  }

  /**
   * Cierra un proyecto si cumple las condiciones.
   * @param {string} proyectoId
   * @returns {Promise<Document>} proyecto cerrado
   */
  async cerrarProyecto(proyectoId) {
    const proyecto = await this.validateProyectoExists(proyectoId);

    if (proyecto.estado === ESTADOS_PROYECTO.CERRADO) {
      throw new ApiError(400, 'El proyecto ya está cerrado');
    }

    const validacion = await this.puedeObtenerProyecto(proyectoId);
    if (!validacion.puede) {
      throw new ApiError(
        400,
        `No se puede cerrar el proyecto. ${validacion.palsPendientes} PAL(s) sin cumplir meta mínima`
      );
    }

    proyecto.estado         = ESTADOS_PROYECTO.CERRADO;
    proyecto.fecha_fin_real = new Date();
    await proyecto.save();

    return proyecto;
  }

  // ──────────────────────────────────────────────────────────────────
  // RESUMEN DE PROYECTO
  // ──────────────────────────────────────────────────────────────────

  /**
   * Devuelve el resumen operativo de un proyecto:
   * datos del proyecto + métricas de sus PALs.
   *
   * ✅ SIN populate — actividad y lote son objetos embebidos en PAL
   * ✅ SIN populate — cliente y zona son objetos embebidos en Proyecto
   *
   * @param {string} proyectoId
   * @returns {Promise<Object>}
   */
  async getResumenProyecto(proyectoId) {
    const proyecto = await this.validateProyectoExists(proyectoId);

    // Traer todos los PALs del proyecto — datos embebidos, sin populate
    const pals = await ProyectoActividadLote.find({ proyecto: proyectoId }).lean();

    const totalPals       = pals.length;
    const palsCumplidas   = pals.filter((p) => p.estado === ESTADOS_PAL.CUMPLIDA).length;
    const palsEnEjecucion = pals.filter((p) => p.estado === ESTADOS_PAL.EN_EJECUCION).length;
    const palsPendientes  = pals.filter((p) => p.estado === ESTADOS_PAL.PENDIENTE).length;
    const palsCanceladas  = pals.filter((p) => p.estado === ESTADOS_PAL.CANCELADA).length;

    const avanceTotal = totalPals > 0
      ? Math.round((palsCumplidas / totalPals) * 100)
      : 0;

    // Métricas de cantidad ejecutada vs meta
    const totalMeta      = pals.reduce((s, p) => s + (p.meta_minima        || 0), 0);
    const totalEjecutado = pals.reduce((s, p) => s + (p.cantidad_ejecutada || 0), 0);
    const avanceCantidad = totalMeta > 0
      ? Math.round((totalEjecutado / totalMeta) * 100)
      : 0;

    return {
      proyecto: proyecto.toObject(),
      resumen: {
        totalPals,
        palsCumplidas,
        palsEnEjecucion,
        palsPendientes,
        palsCanceladas,
        avanceTotal,          // % basado en PALs cumplidas / total
        avanceCantidad,       // % basado en cantidad ejecutada / meta
        totalMeta,
        totalEjecutado,
      },
      pals,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // ESTADÍSTICAS GENERALES
  // ──────────────────────────────────────────────────────────────────

  /**
   * Resumen de todos los proyectos agrupados por estado.
   * @returns {Promise<Object>}
   */
  async getEstadisticasGlobales() {
    const stats = await Proyecto.aggregate([
      {
        $group: {
          _id:   '$estado',
          count: { $sum: 1 },
        },
      },
    ]);

    const totales = await Proyecto.countDocuments();

    const porEstado = {};
    for (const s of stats) {
      porEstado[s._id] = s.count;
    }

    return { totales, porEstado };
  }

  // ──────────────────────────────────────────────────────────────────
  // BÚSQUEDA
  // ──────────────────────────────────────────────────────────────────

  /**
   * Busca proyectos por texto en nombre o código.
   * ✅ SIN populate — datos embebidos listos para usar
   *
   * @param {string} texto
   * @param {string|null} estado  - Filtro opcional por estado
   * @returns {Promise<Array>}
   */
  async buscarProyectos(texto, estado = null) {
    if (!texto || texto.trim() === '') {
      throw new ApiError(400, 'El texto de búsqueda es obligatorio');
    }

    const regex  = new RegExp(texto.trim(), 'i');
    const filtro = {
      $or: [
        { nombre: regex },
        { codigo: regex },
        { 'cliente.nombre': regex },
        { 'zona.nombre': regex },
      ],
    };

    if (estado) filtro.estado = estado;

    const proyectos = await Proyecto.find(filtro)
      .sort({ createdAt: -1 })
      .lean();

    return proyectos;
  }

  // ──────────────────────────────────────────────────────────────────
  // PALs DE UN PROYECTO
  // ──────────────────────────────────────────────────────────────────

  /**
   * Obtiene todos los PALs de un proyecto con filtros opcionales.
   * ✅ SIN populate — actividad y lote son objetos embebidos
   *
   * @param {string} proyectoId
   * @param {{ estado?: string, lote?: string, actividad?: string }} filtros
   * @returns {Promise<Array>}
   */
  async getPalsDeProyecto(proyectoId, filtros = {}) {
    await this.validateProyectoExists(proyectoId);

    const query = { proyecto: proyectoId };

    if (filtros.estado)    query.estado              = filtros.estado;
    if (filtros.lote)      query['lote.nombre']      = new RegExp(filtros.lote, 'i');
    if (filtros.actividad) query['actividad.nombre'] = new RegExp(filtros.actividad, 'i');

    const pals = await ProyectoActividadLote.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return pals;
  }

  /**
   * Verifica si existe un PAL para una combinación proyecto + lote + actividad.
   * Útil para evitar duplicados antes de crear.
   *
   * @param {string} proyectoId
   * @param {string} loteNombre
   * @param {string} actividadNombre
   * @returns {Promise<boolean>}
   */
  async existePAL(proyectoId, loteNombre, actividadNombre) {
    const existente = await ProyectoActividadLote.findOne({
      proyecto:          proyectoId,
      'lote.nombre':     loteNombre,
      'actividad.nombre': actividadNombre,
    });
    return !!existente;
  }
}

module.exports = new ProyectoService();