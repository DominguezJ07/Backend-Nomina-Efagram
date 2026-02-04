const Proyecto = require('../models/proyecto.model');
const ProyectoActividadLote = require('../models/proyectoActividadLote.model');
const Cliente = require('../models/cliente.model');
const { ApiError } = require('../../middlewares/errorHandler');
const { ESTADOS_PROYECTO, ESTADOS_PAL } = require('../../config/constants');

class ProyectoService {
  /**
   * Validar que un proyecto exista
   */
  async validateProyectoExists(proyectoId) {
    const proyecto = await Proyecto.findById(proyectoId);
    if (!proyecto) {
      throw new ApiError(404, 'Proyecto no encontrado');
    }
    return proyecto;
  }

  /**
   * Validar que un cliente exista
   */
  async validateClienteExists(clienteId) {
    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      throw new ApiError(404, 'Cliente no encontrado');
    }
    return cliente;
  }

  /**
   * Verificar si un proyecto puede cerrarse
   * REGLA: No puede cerrar si tiene PALs sin cumplir meta
   */
  async puedeObtenerProyecto(proyectoId) {
    const palsIncumplidos = await ProyectoActividadLote.find({
      proyecto: proyectoId,
      estado: { $nin: [ESTADOS_PAL.CUMPLIDA, ESTADOS_PAL.CANCELADA] }
    });

    const palsSinCumplirMeta = palsIncumplidos.filter(pal => {
      return pal.cantidad_ejecutada < pal.meta_minima;
    });

    return {
      puede: palsSinCumplirMeta.length === 0,
      palsPendientes: palsSinCumplirMeta.length,
      pals: palsSinCumplirMeta
    };
  }

  /**
   * Cerrar un proyecto
   */
  async cerrarProyecto(proyectoId) {
    const proyecto = await this.validateProyectoExists(proyectoId);

    if (proyecto.estado === ESTADOS_PROYECTO.CERRADO) {
      throw new ApiError(400, 'El proyecto ya está cerrado');
    }

    // Verificar que pueda cerrarse
    const validacion = await this.puedeObtenerProyecto(proyectoId);
    if (!validacion.puede) {
      throw new ApiError(400, 
        `No se puede cerrar el proyecto. ${validacion.palsPendientes} PAL(s) sin cumplir meta mínima`
      );
    }

    proyecto.estado = ESTADOS_PROYECTO.CERRADO;
    proyecto.fecha_fin_real = new Date();
    await proyecto.save();

    return proyecto;
  }

  /**
   * Obtener resumen de un proyecto
   */
  async getResumenProyecto(proyectoId) {
    const proyecto = await this.validateProyectoExists(proyectoId);
    
    const pals = await ProyectoActividadLote.find({ proyecto: proyectoId })
      .populate('actividad')
      .populate('lote');

    const totalPals = pals.length;
    const palsCumplidas = pals.filter(p => p.estado === ESTADOS_PAL.CUMPLIDA).length;
    const palsEnEjecucion = pals.filter(p => p.estado === ESTADOS_PAL.EN_EJECUCION).length;
    const palsPendientes = pals.filter(p => p.estado === ESTADOS_PAL.PENDIENTE).length;

    const avanceTotal = totalPals > 0 
      ? Math.round((palsCumplidas / totalPals) * 100)
      : 0;

    return {
      proyecto: proyecto.toObject(),
      resumen: {
        totalPals,
        palsCumplidas,
        palsEnEjecucion,
        palsPendientes,
        avanceTotal
      },
      pals
    };
  }
}

module.exports = new ProyectoService();
