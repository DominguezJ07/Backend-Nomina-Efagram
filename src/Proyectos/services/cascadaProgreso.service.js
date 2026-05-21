/**
 * cascadaProgreso.service.js
 * Ruta: src/Proyectos/services/cascadaProgreso.service.js
 *
 * ✅ SERVICIO DE RECALCULO EN CASCADA
 * 
 * Flujo:
 *    RegistroDiario → Programacion → Contrato → Subproyecto → Proyecto
 *
 * Cuando se crea/actualiza un RegistroDiario:
 *    1. Recalcula Programacion
 *    2. Recalcula Contrato (suma todas sus Programaciones)
 *    3. Recalcula Subproyecto (suma todos sus Contratos)
 *    4. Recalcula Proyecto (suma todos sus Subproyectos)
 */

const Programacion = require('../models/programacion.model');
const Contrato = require('../../Contratos/models/contrato.model');
const Subproyecto = require('../models/subproyecto.model');
const Proyecto = require('../models/proyecto.model');
const RegistroDiarioProgramacion = require('../models/registroDiarioProgramacion.model');
const { ApiError } = require('../../middlewares/errorHandler');

class CascadaProgresoService {

  /**
   * NIVEL 1: Recalcular una Programación (suma de sus registros diarios)
   */
  async recalcularProgramacion(programacionId) {
    try {
      const programacion = await Programacion.findById(programacionId);
      if (!programacion) {
        throw new ApiError(404, 'Programación no encontrada');
      }

      // Obtener todos los registros diarios
      const registros = await RegistroDiarioProgramacion.find({
        programacion: programacionId
      }).lean();

      // Sumar cantidad_ejecutada
      const cantidadEjecutada = registros.reduce((sum, r) => {
        return sum + (r.cantidad_ejecutada || 0);
      }, 0);

      const cantidadProyectada = programacion.cantidad_proyectada || 1;
      const porcentaje = Math.min(
        100,
        Math.round((cantidadEjecutada / cantidadProyectada) * 100)
      );

      // Determinar estado: COMPLETADA cuando cantidad_ejecutada >= cantidad_proyectada
      let estado = programacion.estado;
      if (cantidadEjecutada >= cantidadProyectada && programacion.estado === 'ACTIVA') {
        estado = 'COMPLETADA';
      }

      // Actualizar Programación
      await Programacion.findByIdAndUpdate(
        programacionId,
        {
          $set: {
            cantidad_ejecutada_total: cantidadEjecutada,
            porcentaje_cumplimiento: porcentaje,
            estado,
          },
        },
        { new: true }
      );

      console.log(`✓ Programación ${programacionId}: ${porcentaje}% (${cantidadEjecutada}/${cantidadProyectada})`);

      // Retornar para cascada
      return {
        _id: programacionId,
        contrato_codigo: programacion.contrato?.codigo,
        porcentaje,
        cantidad_ejecutada: cantidadEjecutada,
        cantidad_proyectada: cantidadProyectada,
        estado,
      };
    } catch (error) {
      console.error('Error en recalcularProgramacion:', error.message);
      throw error;
    }
  }

  /**
   * NIVEL 2: Recalcular un Contrato (suma de sus Programaciones)
   */
  async recalcularContrato(contratoId) {
    try {
      const contrato = await Contrato.findById(contratoId).lean();
      if (!contrato) {
        throw new ApiError(404, 'Contrato no encontrado');
      }

      // Obtener todas las programaciones del contrato
      const programaciones = await Programacion.find({
        'contrato.codigo': contrato.codigo
      }).lean();

      if (programaciones.length === 0) {
        console.log(`⚠️  Contrato ${contratoId}: Sin programaciones`);
        return {
          _id: contratoId,
          codigo: contrato.codigo,
          porcentaje: 0,
          estado: 'PENDIENTE',
        };
      }

      // Recalcular cada programación y sumar
      let totalEjecutado = 0;
      let totalProyectado = 0;
      let completadas = 0;

      for (const prog of programaciones) {
        const progreso = await this.recalcularProgramacion(prog._id);
        totalEjecutado += progreso.cantidad_ejecutada;
        totalProyectado += progreso.cantidad_proyectada;
        if (progreso.estado === 'COMPLETADA') completadas++;
      }

      const porcentaje = totalProyectado > 0
        ? Math.round((totalEjecutado / totalProyectado) * 100)
        : 0;

      // Estado automático
      let estado = 'PENDIENTE';
      if (porcentaje === 100 && completadas === programaciones.length) {
        estado = 'COMPLETADO';
      } else if (porcentaje > 0) {
        estado = 'EN_PROGRESO';
      }

      // Actualizar Contrato
      await Contrato.findByIdAndUpdate(
        contratoId,
        {
          $set: {
            porcentaje_ejecucion: porcentaje,
            cantidad_ejecutada: totalEjecutado,
            cantidad_proyectada: totalProyectado,
            estado,
          },
        },
        { new: true }
      );

      console.log(`✓ Contrato ${contrato.codigo}: ${porcentaje}% (${totalEjecutado}/${totalProyectado})`);

      return {
        _id: contratoId,
        codigo: contrato.codigo,
        subproyecto: contrato.subproyecto,
        porcentaje,
        cantidad_ejecutada: totalEjecutado,
        cantidad_proyectada: totalProyectado,
        estado,
      };
    } catch (error) {
      console.error('Error en recalcularContrato:', error.message);
      throw error;
    }
  }

  /**
   * NIVEL 3: Recalcular un Subproyecto (suma de sus Contratos)
   */
  async recalcularSubproyecto(subproyectoId) {
    try {
      const subproyecto = await Subproyecto.findById(subproyectoId).lean();
      if (!subproyecto) {
        throw new ApiError(404, 'Subproyecto no encontrado');
      }

      // Obtener todos los contratos del subproyecto
      const contratos = await Contrato.find({
        subproyecto: subproyectoId
      }).lean();

      if (contratos.length === 0) {
        console.log(`⚠️  Subproyecto ${subproyectoId}: Sin contratos`);
        return {
          _id: subproyectoId,
          nombre: subproyecto.nombre,
          porcentaje: 0,
          estado: 'PENDIENTE',
        };
      }

      // Recalcular cada contrato y sumar
      let totalEjecutado = 0;
      let totalProyectado = 0;
      let completados = 0;

      for (const contrato of contratos) {
        const progreso = await this.recalcularContrato(contrato._id);
        totalEjecutado += progreso.cantidad_ejecutada;
        totalProyectado += progreso.cantidad_proyectada;
        if (progreso.estado === 'COMPLETADO') completados++;
      }

      const porcentaje = totalProyectado > 0
        ? Math.round((totalEjecutado / totalProyectado) * 100)
        : 0;

      // Estado automático
      let estado = 'PENDIENTE';
      if (porcentaje === 100 && completados === contratos.length) {
        estado = 'COMPLETADO';
      } else if (porcentaje > 0) {
        estado = 'EN_PROGRESO';
      }

      // Actualizar Subproyecto
      await Subproyecto.findByIdAndUpdate(
        subproyectoId,
        {
          $set: {
            porcentaje_ejecucion: porcentaje,
            cantidad_ejecutada: totalEjecutado,
            cantidad_proyectada: totalProyectado,
            estado,
          },
        },
        { new: true }
      );

      console.log(`✓ Subproyecto ${subproyecto.nombre}: ${porcentaje}% (${totalEjecutado}/${totalProyectado})`);

      return {
        _id: subproyectoId,
        nombre: subproyecto.nombre,
        proyecto_id: subproyecto.proyecto_id,
        porcentaje,
        cantidad_ejecutada: totalEjecutado,
        cantidad_proyectada: totalProyectado,
        estado,
      };
    } catch (error) {
      console.error('Error en recalcularSubproyecto:', error.message);
      throw error;
    }
  }

  /**
   * NIVEL 4: Recalcular un Proyecto (suma de sus Subproyectos)
   */
  async recalcularProyecto(proyectoId) {
    try {
      const proyecto = await Proyecto.findById(proyectoId).lean();
      if (!proyecto) {
        throw new ApiError(404, 'Proyecto no encontrado');
      }

      // Obtener todos los subproyectos
      const subproyectos = await Subproyecto.find({
        proyecto_id: proyectoId
      }).lean();

      if (subproyectos.length === 0) {
        console.log(`⚠️  Proyecto ${proyectoId}: Sin subproyectos`);
        return {
          _id: proyectoId,
          nombre: proyecto.nombre,
          porcentaje: 0,
          estado: 'PENDIENTE',
        };
      }

      // Recalcular cada subproyecto y sumar
      let totalEjecutado = 0;
      let totalProyectado = 0;
      let completados = 0;

      for (const subproyecto of subproyectos) {
        const progreso = await this.recalcularSubproyecto(subproyecto._id);
        totalEjecutado += progreso.cantidad_ejecutada;
        totalProyectado += progreso.cantidad_proyectada;
        if (progreso.estado === 'COMPLETADO') completados++;
      }

      const porcentaje = totalProyectado > 0
        ? Math.round((totalEjecutado / totalProyectado) * 100)
        : 0;

      // Estado automático
      let estado = 'PENDIENTE';
      if (porcentaje === 100 && completados === subproyectos.length) {
        estado = 'COMPLETADO';
      } else if (porcentaje > 0) {
        estado = 'EN_PROGRESO';
      }

      // Actualizar Proyecto
      await Proyecto.findByIdAndUpdate(
        proyectoId,
        {
          $set: {
            porcentaje_ejecucion: porcentaje,
            cantidad_ejecutada_total: totalEjecutado,
            cantidad_proyectada_total: totalProyectado,
            estado,
          },
        },
        { new: true }
      );

      console.log(`✓ Proyecto ${proyecto.nombre}: ${porcentaje}% (${totalEjecutado}/${totalProyectado})`);

      return {
        _id: proyectoId,
        nombre: proyecto.nombre,
        porcentaje,
        cantidad_ejecutada: totalEjecutado,
        cantidad_proyectada: totalProyectado,
        estado,
      };
    } catch (error) {
      console.error('Error en recalcularProyecto:', error.message);
      throw error;
    }
  }

  /**
   * DISPARA LA CASCADA COMPLETA
   * Entrada: ID de Programación
   * Salida: Recalcula en cascada hacia arriba
   */
  async dispararCascada(programacionId) {
    try {
      // 1. Recalcular Programación
      const programacion = await Programacion.findById(programacionId).lean();
      if (!programacion) throw new ApiError(404, 'Programación no encontrada');

      await this.recalcularProgramacion(programacionId);

      // 2. Encontrar Contrato por código de programación
      const contratosCodigo = programacion.contrato?.codigo;
      if (contratosCodigo) {
        const contrato = await Contrato.findOne({ codigo: contratosCodigo });
        if (contrato) {
          await this.recalcularContrato(contrato._id);

          // 3. Recalcular Subproyecto
          if (contrato.subproyecto) {
            await this.recalcularSubproyecto(contrato.subproyecto);

            // 4. Recalcular Proyecto
            const subproyecto = await Subproyecto.findById(contrato.subproyecto).lean();
            if (subproyecto?.proyecto_id) {
              await this.recalcularProyecto(subproyecto.proyecto_id);
            }
          }
        }
      }

      console.log('✅ Cascada completada para Programación:', programacionId);
    } catch (error) {
      console.error('Error en dispararCascada:', error.message);
      throw error;
    }
  }
}

module.exports = new CascadaProgresoService();
