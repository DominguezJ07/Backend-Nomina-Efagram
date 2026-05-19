const RegistroDiario = require('../../Ejecucion/models/registroDiario.model');
const Persona = require('../../Personal/models/persona.model');
const { parseDateOrNull, isValidDateValue } = require('../../utils/dateUtils');

/**
 * Calcular nómina por trabajador en un período
 */
const calcularNominaPorTrabajador = async (trabajadorId, fechaInicio, fechaFin) => {
  try {
    const trabajador = await Persona.findById(trabajadorId).lean();

    if (!trabajador) {
      throw new Error('Trabajador no encontrado');
    }

    // 🔥 VALIDACIÓN DE FECHAS: No permitir "RegistroDiario" u otros valores inválidos
    if (!isValidDateValue(fechaInicio) || !isValidDateValue(fechaFin)) {
      throw new Error(`Fechas inválidas. Recibido: fechaInicio="${fechaInicio}", fechaFin="${fechaFin}". Debe usar formato ISO 8601 (ej: 2026-05-01)`);
    }

    const fechaInicioDate = parseDateOrNull(fechaInicio);
    const fechaFinDate = parseDateOrNull(fechaFin);

    if (!fechaInicioDate || !fechaFinDate) {
      throw new Error('No se pudieron parsear las fechas proporcionadas');
    }

    // Obtener registros del trabajador
    const registros = await RegistroDiario.find({
      trabajador: trabajadorId,
      fecha: {
        $gte: fechaInicioDate,
        $lte: fechaFinDate
      },
      estado: { $in: ['APROBADO', 'CORREGIDO'] }
    })
      .populate('proyecto_actividad_lote')
      .lean();

    // Calcular totales
    const totalDiasTrabajados = [...new Set(registros.map(r => 
      new Date(r.fecha).toISOString().split('T')[0]
    ))].length;

    const totalHorasTrabajadas = registros.reduce(
      (sum, r) => sum + (r.horas_trabajadas || 0),
      0
    );

    const totalCantidadEjecutada = registros.reduce(
      (sum, r) => sum + (r.cantidad_ejecutada || 0),
      0
    );

    // Cálculo simple de nómina (ajustar según reglas de negocio)
    const valorDia = 50000;
    const valorHoraExtra = 8000;
    const horasNormalesPorDia = 8;

    const horasNormales = Math.min(totalHorasTrabajadas, totalDiasTrabajados * horasNormalesPorDia);
    const horasExtras = Math.max(0, totalHorasTrabajadas - horasNormales);

    const nominaBase = totalDiasTrabajados * valorDia;
    const pagoHorasExtras = horasExtras * valorHoraExtra;
    const nominaTotal = nominaBase + pagoHorasExtras;

    return {
      trabajador: {
        id: trabajador._id,
        nombre_completo: trabajador.nombreCompleto || `${trabajador.nombres} ${trabajador.apellidos}`,
        documento: trabajador.numeroDocumento,
        cargo: trabajador.cargo
      },
      periodo: {
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin
      },
      resumen: {
        total_dias_trabajados: totalDiasTrabajados,
        total_horas_trabajadas: totalHorasTrabajadas,
        horas_normales: horasNormales,
        horas_extras: horasExtras,
        total_cantidad_ejecutada: totalCantidadEjecutada,
        total_registros: registros.length
      },
      calculo_nomina: {
        nomina_base: nominaBase,
        pago_horas_extras: pagoHorasExtras,
        nomina_total: nominaTotal
      },
      registros_detallados: registros
    };
  } catch (error) {
    throw new Error(`Error al calcular nómina: ${error.message}`);
  }
};

/**
 * Obtener resumen de nómina para múltiples trabajadores
 */
const getResumenNominaGeneral = async (fechaInicio, fechaFin) => {
  try {
    // 🔥 VALIDACIÓN DE FECHAS: No permitir "RegistroDiario" u otros valores inválidos
    if (!isValidDateValue(fechaInicio) || !isValidDateValue(fechaFin)) {
      console.warn(`getResumenNominaGeneral - Fechas inválidas. Recibido: fechaInicio="${fechaInicio}", fechaFin="${fechaFin}"`);
      throw new Error(`Fechas inválidas. Se requieren fechas en formato ISO 8601. Recibido: "${fechaInicio}" y "${fechaFin}"`);
    }

    const fechaInicioDate = parseDateOrNull(fechaInicio);
    const fechaFinDate = parseDateOrNull(fechaFin);

    if (!fechaInicioDate || !fechaFinDate) {
      throw new Error('No se pudieron parsear las fechas proporcionadas');
    }

    const registros = await RegistroDiario.find({
      fecha: {
        $gte: fechaInicioDate,
        $lte: fechaFinDate
      },
      estado: { $in: ['APROBADO', 'CORREGIDO'] }
    })
      .populate('trabajador')
      .lean();

    const trabajadoresIds = [...new Set(registros.map(r => r.trabajador?._id?.toString()))].filter(Boolean);

    const nominasPorTrabajador = await Promise.all(
      trabajadoresIds.map(id => calcularNominaPorTrabajador(id, fechaInicio, fechaFin))
    );

    const totalNominaGeneral = nominasPorTrabajador.reduce(
      (sum, n) => sum + n.calculo_nomina.nomina_total,
      0
    );

    const totalHorasGenerales = nominasPorTrabajador.reduce(
      (sum, n) => sum + n.resumen.total_horas_trabajadas,
      0
    );

    return {
      periodo: {
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin
      },
      resumen_general: {
        total_trabajadores: nominasPorTrabajador.length,
        nomina_total: totalNominaGeneral,
        total_horas: totalHorasGenerales,
        promedio_nomina_por_trabajador: nominasPorTrabajador.length > 0
          ? (totalNominaGeneral / nominasPorTrabajador.length).toFixed(2)
          : 0
      },
      detalle_por_trabajador: nominasPorTrabajador.map(n => ({
        trabajador: n.trabajador,
        dias_trabajados: n.resumen.total_dias_trabajados,
        horas_trabajadas: n.resumen.total_horas_trabajadas,
        nomina_total: n.calculo_nomina.nomina_total
      }))
    };
  } catch (error) {
    throw new Error(`Error al generar resumen general de nómina: ${error.message}`);
  }
};

module.exports = {
  calcularNominaPorTrabajador,
  getResumenNominaGeneral
};