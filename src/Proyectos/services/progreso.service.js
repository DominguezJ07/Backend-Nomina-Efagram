/**
 * progreso.service.js
 * Ruta: src/Proyectos/services/progreso.service.js
 *
 * ✅ Lógica de cálculo de progreso en cascada:
 *    Proyectos ← Subproyectos ← Contratos (Programación) ← Registros Diarios
 *
 * ✅ FLUJO:
 *    1. Registro Diario → cantidad_ejecutada
 *    2. Programación → sum(cantidad_ejecutada) / cantidad_proyectada = %
 *    3. Subproyecto → sum(% programaciones) / total_programaciones = %
 *    4. Proyecto → sum(% subproyectos) / total_subproyectos = %
 */

const Proyecto = require('../models/proyecto.model');
const Subproyecto = require('../models/subproyecto.model');
const Programacion = require('../models/programacion.model');
const RegistroDiarioProgramacion = require('../models/registroDiarioProgramacion.model');
const Contrato = require('../../Contratos/models/contrato.model');
const { ApiError } = require('../../middlewares/errorHandler');

class ProgresoService {
  
  /**
   * NIVEL 1: Calcular progreso de una Programación (por sus registros diarios)
   * Entrada: programacion._id
   * Salida: { cantidad_ejecutada, cantidad_proyectada, porcentaje, estado }
   */
  async calcularProgesoProgramacion(programacionId) {
    try {
      const programacion = await Programacion.findById(programacionId).lean();
      if (!programacion) {
        throw new ApiError(404, 'Programación no encontrada');
      }

      const registros = await RegistroDiarioProgramacion.find({
        programacion: programacionId
      }).lean();

      const cantidadEjecutada = registros.reduce((sum, r) => {
        return sum + (r.cantidad_ejecutada || 0);
      }, 0);

      const cantidadProyectada = programacion.cantidad_proyectada || 1;
      const porcentaje = Math.min(
        100,
        Math.round((cantidadEjecutada / cantidadProyectada) * 100)
      );

      // Determinar estado
      let estado = 'PENDIENTE';
      if (porcentaje === 100) estado = 'COMPLETADA';
      else if (porcentaje > 0) estado = 'EN_PROGRESO';

      return {
        _id: programacionId,
        cantidad_ejecutada: cantidadEjecutada,
        cantidad_proyectada: cantidadProyectada,
        porcentaje,
        estado,
        registros_diarios: registros.length,
      };
    } catch (error) {
      console.error('Error en calcularProgesoProgramacion:', error);
      throw error;
    }
  }

  /**
   * NIVEL 2: Calcular progreso de un Subproyecto
   * ← Suma de todas sus Programaciones (vía Contratos)
   * Entrada: subproyecto._id
   * Salida: { porcentaje, cantidad_ejecutada, cantidad_proyectada, total_programaciones, ... }
   */
  async calcularProgresoSubproyecto(subproyectoId) {
    try {
      const subproyecto = await Subproyecto.findById(subproyectoId).lean();
      if (!subproyecto) {
        throw new ApiError(404, 'Subproyecto no encontrado');
      }

      // 1. Obtener todos los contratos del subproyecto
      const contratos = await Contrato.find({
        subproyecto: subproyectoId
      }).lean();

      if (contratos.length === 0) {
        return {
          _id: subproyectoId,
          nombre: subproyecto.nombre,
          porcentaje: 0,
          cantidad_ejecutada: 0,
          cantidad_proyectada: 0,
          total_programaciones: 0,
          total_contratos: 0,
          estado: 'SIN_PROGRAMACIONES',
          detalles: [],
        };
      }

      // 2. Para cada contrato, obtener sus programaciones
      const detalles = [];
      let totalEjecutado = 0;
      let totalProyectado = 0;

      for (const contrato of contratos) {
        const programaciones = await Programacion.find({
          'contrato.codigo': contrato.codigo
        }).lean();

        for (const prog of programaciones) {
          const progreso = await this.calcularProgesoProgramacion(prog._id);
          detalles.push({
            contrato_codigo: contrato.codigo,
            programacion_id: prog._id,
            ...progreso,
          });
          totalEjecutado += progreso.cantidad_ejecutada;
          totalProyectado += progreso.cantidad_proyectada;
        }
      }

      const porcentaje = totalProyectado > 0
        ? Math.round((totalEjecutado / totalProyectado) * 100)
        : 0;

      let estado = 'PENDIENTE';
      if (porcentaje === 100) estado = 'COMPLETADO';
      else if (porcentaje > 0) estado = 'EN_PROGRESO';

      return {
        _id: subproyectoId,
        nombre: subproyecto.nombre,
        codigo: subproyecto.codigo,
        porcentaje,
        cantidad_ejecutada: totalEjecutado,
        cantidad_proyectada: totalProyectado,
        total_programaciones: detalles.length,
        total_contratos: contratos.length,
        estado,
        detalles,
      };
    } catch (error) {
      console.error('Error en calcularProgresoSubproyecto:', error);
      throw error;
    }
  }

  /**
   * NIVEL 3: Calcular progreso de un Proyecto
   * ← Suma de todos sus Subproyectos
   * Entrada: proyecto._id
   * Salida: { porcentaje, total_subproyectos, subproyectos_completados, ... }
   */
  async calcularProgresoProyecto(proyectoId) {
    try {
      const proyecto = await Proyecto.findById(proyectoId).lean();
      if (!proyecto) {
        throw new ApiError(404, 'Proyecto no encontrado');
      }

      // 1. Obtener todos los subproyectos
      const subproyectos = await Subproyecto.find({
        proyecto_id: proyectoId
      }).lean();

      if (subproyectos.length === 0) {
        return {
          _id: proyectoId,
          nombre: proyecto.nombre,
          codigo: proyecto.codigo,
          porcentaje: 0,
          total_subproyectos: 0,
          subproyectos_completados: 0,
          subproyectos_en_progreso: 0,
          subproyectos_pendientes: 0,
          cantidad_ejecutada_total: 0,
          cantidad_proyectada_total: 0,
          estado: 'SIN_SUBPROYECTOS',
          detalles: [],
        };
      }

      // 2. Calcular progreso de cada subproyecto
      const detalles = [];
      let completados = 0;
      let enProgreso = 0;
      let pendientes = 0;

      for (const sub of subproyectos) {
        const progreso = await this.calcularProgresoSubproyecto(sub._id);
        detalles.push(progreso);

        if (progreso.porcentaje === 100) completados++;
        else if (progreso.porcentaje > 0) enProgreso++;
        else pendientes++;
      }

      // 3. Calcular promedio ponderado
      const totalEjecutado = detalles.reduce((s, d) => s + d.cantidad_ejecutada, 0);
      const totalProyectado = detalles.reduce((s, d) => s + d.cantidad_proyectada, 0);

      const porcentaje = totalProyectado > 0
        ? Math.round((totalEjecutado / totalProyectado) * 100)
        : 0;

      let estado = 'PENDIENTE';
      if (completados === subproyectos.length) estado = 'COMPLETADO';
      else if (enProgreso > 0 || completados > 0) estado = 'EN_PROGRESO';

      return {
        _id: proyectoId,
        nombre: proyecto.nombre,
        codigo: proyecto.codigo,
        porcentaje,
        total_subproyectos: subproyectos.length,
        subproyectos_completados: completados,
        subproyectos_en_progreso: enProgreso,
        subproyectos_pendientes: pendientes,
        cantidad_ejecutada_total: totalEjecutado,
        cantidad_proyectada_total: totalProyectado,
        estado,
        detalles,
      };
    } catch (error) {
      console.error('Error en calcularProgresoProyecto:', error);
      throw error;
    }
  }

  /**
   * Obtener progreso de TODOS los proyectos
   */
  async obtenerProgresoTodoProyectos() {
    try {
      const proyectos = await Proyecto.find({}).lean();

      const progresos = await Promise.all(
        proyectos.map(p => this.calcularProgresoProyecto(p._id))
      );

      return {
        total_proyectos: proyectos.length,
        proyectos_completados: progresos.filter(p => p.porcentaje === 100).length,
        proyectos_en_progreso: progresos.filter(p => p.porcentaje > 0 && p.porcentaje < 100).length,
        proyectos_pendientes: progresos.filter(p => p.porcentaje === 0).length,
        progresos,
      };
    } catch (error) {
      console.error('Error en obtenerProgresoTodoProyectos:', error);
      throw error;
    }
  }

  /**
   * Obtener progreso de TODOS los subproyectos de un proyecto
   */
  async obtenerProgresoSubproyectosPorProyecto(proyectoId) {
    try {
      const subproyectos = await Subproyecto.find({
        proyecto_id: proyectoId
      }).lean();

      const progresos = await Promise.all(
        subproyectos.map(s => this.calcularProgresoSubproyecto(s._id))
      );

      return {
        proyecto_id: proyectoId,
        total_subproyectos: subproyectos.length,
        subproyectos_completados: progresos.filter(s => s.porcentaje === 100).length,
        subproyectos_en_progreso: progresos.filter(s => s.porcentaje > 0 && s.porcentaje < 100).length,
        subproyectos_pendientes: progresos.filter(s => s.porcentaje === 0).length,
        progresos,
      };
    } catch (error) {
      console.error('Error en obtenerProgresoSubproyectosPorProyecto:', error);
      throw error;
    }
  }
}

module.exports = new ProgresoService();
