/**
 * proyecto.service.js
 * Ruta: src/Proyectos/services/proyecto.service.js
 *
 * ✅ Sin populate
 * ✅ Búsquedas por datos planos (nombre, codigo)
 * ✅ Sin IDs en subdocumentos
 */

const Proyecto              = require('../models/proyecto.model');
const ProyectoActividadLote = require('../models/proyectoActividadLote.model');
const { ApiError }          = require('../../middlewares/errorHandler');
const { ESTADOS_PROYECTO, ESTADOS_PAL } = require('../../config/constants');

class ProyectoService {

  // ── VALIDACIÓN BASE ───────────────────────────────────────────
  async validateProyectoExists(proyectoId) {
    const proyecto = await Proyecto.findById(proyectoId);
    if (!proyecto) throw new ApiError(404, 'Proyecto no encontrado');
    return proyecto;
  }

  // ── CIERRE DE PROYECTO ────────────────────────────────────────
  /**
   * Verifica si el proyecto puede cerrarse.
   * Revisa PALs sin meta cumplida.
   * ✅ Sin populate — actividad y lote son objetos planos en PAL
   */
  async puedeObtenerProyecto(proyectoId) {
    const palsIncumplidos = await ProyectoActividadLote.find({
      proyecto: proyectoId,
      estado:   { $nin: [ESTADOS_PAL.CUMPLIDA, ESTADOS_PAL.CANCELADA] },
    }).lean();

    const palsSinMeta = palsIncumplidos.filter(
      (pal) => pal.cantidad_ejecutada < pal.meta_minima
    );

    return {
      puede:          palsSinMeta.length === 0,
      palsPendientes: palsSinMeta.length,
      pals:           palsSinMeta,
    };
  }

  /**
   * Cierra el proyecto si cumple condiciones de negocio.
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

  // ── RESUMEN DE PROYECTO ───────────────────────────────────────
  /**
   * Resumen operativo con métricas de PALs.
   * ✅ Sin populate — todos los datos son planos
   */
  async getResumenProyecto(proyectoId) {
    const proyecto = await this.validateProyectoExists(proyectoId);

    const pals = await ProyectoActividadLote.find({ proyecto: proyectoId }).lean();

    const totalPals       = pals.length;
    const palsCumplidas   = pals.filter((p) => p.estado === ESTADOS_PAL.CUMPLIDA).length;
    const palsEnEjecucion = pals.filter((p) => p.estado === ESTADOS_PAL.EN_EJECUCION).length;
    const palsPendientes  = pals.filter((p) => p.estado === ESTADOS_PAL.PENDIENTE).length;
    const palsCanceladas  = pals.filter((p) => p.estado === ESTADOS_PAL.CANCELADA).length;

    const avanceTotal = totalPals > 0
      ? Math.round((palsCumplidas / totalPals) * 100)
      : 0;

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
        avanceTotal,
        avanceCantidad,
        totalMeta,
        totalEjecutado,
      },
      pals,
    };
  }

  // ── ESTADÍSTICAS GLOBALES ─────────────────────────────────────
  async getEstadisticasGlobales() {
    const stats   = await Proyecto.aggregate([
      { $group: { _id: '$estado', count: { $sum: 1 } } },
    ]);
    const totales = await Proyecto.countDocuments();

    const porEstado = {};
    for (const s of stats) {
      porEstado[s._id] = s.count;
    }

    return { totales, porEstado };
  }

  // ── BÚSQUEDA ──────────────────────────────────────────────────
  /**
   * Búsqueda por texto en campos planos.
   * ✅ Sin populate — busca en campos embebidos directamente
   */
  async buscarProyectos(texto, estado = null) {
    if (!texto || texto.trim() === '') {
      throw new ApiError(400, 'El texto de búsqueda es obligatorio');
    }

    const regex  = new RegExp(texto.trim(), 'i');
    const filtro = {
      $or: [
        { nombre:           regex },
        { codigo:           regex },
        { 'cliente.nombre': regex },
        { 'zona.nombre':    regex },
      ],
    };

    if (estado) filtro.estado = estado;

    return Proyecto.find(filtro).sort({ createdAt: -1 }).lean();
  }

  // ── PALs DE UN PROYECTO ───────────────────────────────────────
  /**
   * Obtiene PALs con filtros opcionales sobre campos planos.
   * ✅ Sin populate — filtra por lote.nombre y actividad.nombre directamente
   */
  async getPalsDeProyecto(proyectoId, filtros = {}) {
    await this.validateProyectoExists(proyectoId);

    const query = { proyecto: proyectoId };

    // Filtros por datos planos — sin IDs
    if (filtros.estado)    query.estado               = filtros.estado;
    if (filtros.lote)      query['lote.nombre']       = new RegExp(filtros.lote, 'i');
    if (filtros.actividad) query['actividad.nombre']  = new RegExp(filtros.actividad, 'i');

    return ProyectoActividadLote.find(query).sort({ createdAt: -1 }).lean();
  }

  /**
   * Verifica si ya existe un PAL con esa combinación de datos planos.
   * Útil para evitar duplicados antes de crear.
   * ✅ Sin ObjectId en subdocumentos — busca por nombre
   */
  async existePAL(proyectoId, loteNombre, actividadNombre) {
    const existente = await ProyectoActividadLote.findOne({
      proyecto:           proyectoId,
      'lote.nombre':      loteNombre,
      'actividad.nombre': actividadNombre,
    });
    return !!existente;
  }
}

module.exports = new ProyectoService();