
const RegistroDiario = require('../models/registroDiario.model');
const ProyectoActividadLote = require('../../Proyectos/models/proyectoActividadLote.model');
const AsignacionSupervisor = require('../../Personal/models/asignacionSupervisor.model');
const Lote = require('../../Territorial/models/lote.model');
const { ApiError } = require('../../middlewares/errorHandler');
const { DateTime } = require('luxon');

class RegistroDiarioService {
  /**
   * Validar que un registro diario exista
   */
  async validateRegistroExists(registroId) {
    const registro = await RegistroDiario.findById(registroId);
    if (!registro) {
      throw new ApiError(404, 'Registro diario no encontrado');
    }
    return registro;
  }

  /**
   * Verificar que el supervisor tenga acceso al lote
   */
  async verificarAccesoSupervisor(supervisorId, palId) {
    const pal = await ProyectoActividadLote.findById(palId).populate('lote');
    if (!pal) {
      throw new ApiError(404, 'PAL no encontrado');
    }

    const loteId = pal.lote._id;

    // Obtener el lote con su jerarquía completa
    const lote = await Lote.findById(loteId).populate({
      path: 'finca',
      populate: {
        path: 'nucleo',
        populate: { path: 'zona' }
      }
    });

    if (!lote) {
      throw new ApiError(404, 'Lote no encontrado');
    }

    // Buscar asignaciones activas del supervisor
    const asignaciones = await AsignacionSupervisor.find({
      supervisor: supervisorId,
      activa: true
    });

    for (const asig of asignaciones) {
      // Si está asignado al lote específico
      if (asig.lote && asig.lote.toString() === loteId.toString()) {
        return true;
      }

      // Si está asignado a la finca del lote
      if (asig.finca && asig.finca.toString() === lote.finca._id.toString()) {
        return true;
      }

      // Si está asignado al núcleo del lote
      if (asig.nucleo && asig.nucleo.toString() === lote.finca.nucleo._id.toString()) {
        return true;
      }
    }

    throw new ApiError(403, 'El supervisor no tiene acceso a este lote');
  }

  /**
   * Validar que no exista un registro duplicado
   */
  async validarRegistroUnico(fecha, trabajadorId, palId, registroIdExcluir = null) {
    const query = {
      fecha,
      trabajador: trabajadorId,
      proyecto_actividad_lote: palId
    };

    if (registroIdExcluir) {
      query._id = { $ne: registroIdExcluir };
    }

    const existe = await RegistroDiario.findOne(query);
    if (existe) {
      throw new ApiError(409, 'Ya existe un registro para este trabajador en esta fecha y PAL');
    }
  }

  /**
   * Actualizar la cantidad ejecutada del PAL
   */
  async actualizarCantidadPAL(palId) {
    const registros = await RegistroDiario.find({
      proyecto_actividad_lote: palId,
      estado: { $in: ['APROBADO', 'CORREGIDO'] }
    });

    const totalEjecutado = registros.reduce((sum, reg) => sum + reg.cantidad_ejecutada, 0);

    const pal = await ProyectoActividadLote.findById(palId);
    if (pal) {
      pal.cantidad_ejecutada = totalEjecutado;

      // Actualizar estado automáticamente
      if (totalEjecutado >= pal.meta_minima && pal.estado !== 'CUMPLIDA') {
        pal.estado = 'CUMPLIDA';
        pal.fecha_fin_real = new Date();
      } else if (totalEjecutado > 0 && pal.estado === 'PENDIENTE') {
        pal.estado = 'EN_EJECUCION';
        pal.fecha_inicio_real = pal.fecha_inicio_real || new Date();
      }

      await pal.save();
    }

    return pal;
  }

  /**
   * Verificar si se puede editar un registro (regla jueves-jueves)
   */
  puedeEditar(registro, usuarioRoles) {
    const hoy = DateTime.now().setZone('America/Bogota');
    const fechaRegistro = DateTime.fromJSDate(registro.fecha).setZone('America/Bogota');

    // Calcular el jueves siguiente a la fecha del registro
    let juevesSiguiente = fechaRegistro.plus({ days: (11 - fechaRegistro.weekday) % 7 });
    if (juevesSiguiente <= fechaRegistro) {
      juevesSiguiente = juevesSiguiente.plus({ weeks: 1 });
    }

    // Supervisor puede editar hasta el jueves
    if (hoy <= juevesSiguiente && usuarioRoles.includes('SUPERVISOR')) {
      return { puede: true, motivo: 'Dentro del período de edición del supervisor' };
    }

    // Jefe de operaciones puede editar después del jueves
    if (hoy > juevesSiguiente && (usuarioRoles.includes('JEFE_OPERACIONES') || usuarioRoles.includes('ADMIN_SISTEMA'))) {
      return { puede: true, motivo: 'Edición por jefe de operaciones' };
    }

    return { puede: false, motivo: 'Fuera del período de edición permitido' };
  }

  /**
   * Obtener resumen de registros por trabajador en un período
   */
  async getResumenTrabajador(trabajadorId, fechaInicio, fechaFin) {
    const registros = await RegistroDiario.find({
      trabajador: trabajadorId,
      fecha: { $gte: fechaInicio, $lte: fechaFin },
      estado: { $in: ['APROBADO', 'CORREGIDO'] }
    }).populate('proyecto_actividad_lote');

    const totalDias = registros.length;
    const totalHoras = registros.reduce((sum, reg) => sum + reg.horas_trabajadas, 0);

    // Agrupar por PAL
    const porPAL = {};
    registros.forEach(reg => {
      const palId = reg.proyecto_actividad_lote._id.toString();
      if (!porPAL[palId]) {
        porPAL[palId] = {
          pal: reg.proyecto_actividad_lote,
          dias: 0,
          cantidad: 0,
          horas: 0
        };
      }
      porPAL[palId].dias++;
      porPAL[palId].cantidad += reg.cantidad_ejecutada;
      porPAL[palId].horas += reg.horas_trabajadas;
    });

    return {
      trabajador: trabajadorId,
      periodo: { inicio: fechaInicio, fin: fechaFin },
      totalDias,
      totalHoras,
      porPAL: Object.values(porPAL)
    };
  }

  /**
   * Obtener registros de una semana operativa
   */
  async getRegistrosSemana(fechaInicio, fechaFin, filtros = {}) {
    return await RegistroDiario.getRegistrosSemana(fechaInicio, fechaFin, filtros);
  }
}

module.exports = new RegistroDiarioService();