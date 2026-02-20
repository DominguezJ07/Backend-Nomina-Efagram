const mongoose = require('mongoose');
const { TIPOS_NOVEDAD } = require('../../config/constants');

const novedadSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: [true, 'El código es obligatorio'],
    unique: true,
    uppercase: true,
    trim: true
  },

  // Fecha de la novedad
  fecha: {
    type: Date,
    required: [true, 'La fecha es obligatoria'],
    index: true
  },

  // Trabajador afectado
  trabajador: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: [true, 'El trabajador es obligatorio']
  },

  // ✅ NUEVO: Cuadrilla afectada
  cuadrilla: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cuadrilla',
    default: null
  },

  // ✅ NUEVO: Finca donde ocurre la novedad
  finca: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Finca',
    default: null
  },

  // Tipo de novedad — ✅ CORREGIDO: sincronizado con constants.js (incluye LLUVIA, INSUMOS, HERRAMIENTAS)
  tipo: {
    type: String,
    enum: Object.values(TIPOS_NOVEDAD),
    required: [true, 'El tipo de novedad es obligatorio']
  },

  // ✅ NUEVO: Horas no trabajadas (especialmente útil para LLUVIA y paradas parciales)
  horas: {
    type: Number,
    min: [0, 'Las horas no pueden ser negativas'],
    max: [24, 'Las horas no pueden superar 24'],
    default: null,
    validate: {
      validator: function (value) {
        // Si hay horas, no debería haber días completos simultáneamente (a menos que sea nulo)
        if (value !== null && value !== undefined && this.dias && this.dias >= 1) {
          // Permitir ambos, pero advertir en lógica de negocio
          return true;
        }
        return true;
      },
      message: 'Valor de horas inválido'
    }
  },

  // Afecta la nómina
  afecta_nomina: {
    type: Boolean,
    default: true
  },

  // Descripción
  descripcion: {
    type: String,
    required: [true, 'La descripción es obligatoria'],
    trim: true
  },

  // Duración (en días) — para novedades de días completos
  dias: {
    type: Number,
    default: 1,
    min: [0.5, 'Mínimo medio día']
  },

  // Rango de fechas (si aplica)
  fecha_inicio: {
    type: Date
  },
  fecha_fin: {
    type: Date,
    validate: {
      validator: function (value) {
        if (!value || !this.fecha_inicio) return true;
        return value >= this.fecha_inicio;
      },
      message: 'La fecha fin no puede ser anterior a la fecha inicio'
    }
  },

  // Documentos de soporte
  documento_soporte: {
    type: String,
    trim: true
  },

  // Quien registra
  registrado_por: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: [true, 'Quien registra es obligatorio']
  },

  // Aprobación
  requiere_aprobacion: {
    type: Boolean,
    default: false
  },
  aprobado: {
    type: Boolean,
    default: null
  },
  aprobado_por: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona'
  },
  fecha_aprobacion: {
    type: Date
  },
  motivo_rechazo: {
    type: String,
    trim: true
  },

  // Estado
  estado: {
    type: String,
    enum: ['PENDIENTE', 'APROBADA', 'RECHAZADA', 'ANULADA'],
    default: 'PENDIENTE'
  },

  // Observaciones
  observaciones: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// ========================================
// ÍNDICES
// ========================================

novedadSchema.index({ trabajador: 1, fecha: -1 });
novedadSchema.index({ tipo: 1, fecha: -1 });
novedadSchema.index({ estado: 1 });
novedadSchema.index({ codigo: 1 }, { unique: true });
// ✅ NUEVO: índices para cuadrilla y finca
novedadSchema.index({ cuadrilla: 1, fecha: -1 });
novedadSchema.index({ finca: 1, fecha: -1 });
// ✅ NUEVO: índice para consultas de horas perdidas por lluvia en un período
novedadSchema.index({ tipo: 1, finca: 1, fecha: -1 });

// ========================================
// MÉTODOS DE INSTANCIA
// ========================================

// Aprobar novedad
novedadSchema.methods.aprobar = function (aprobadoPorId) {
  this.aprobado = true;
  this.estado = 'APROBADA';
  this.aprobado_por = aprobadoPorId;
  this.fecha_aprobacion = new Date();
  return this.save();
};

// Rechazar novedad
novedadSchema.methods.rechazar = function (aprobadoPorId, motivo) {
  this.aprobado = false;
  this.estado = 'RECHAZADA';
  this.aprobado_por = aprobadoPorId;
  this.fecha_aprobacion = new Date();
  this.motivo_rechazo = motivo;
  return this.save();
};

// ========================================
// MÉTODOS ESTÁTICOS
// ========================================

// Obtener novedades de un período con filtros opcionales
novedadSchema.statics.getNovedadesPeriodo = function (fechaInicio, fechaFin, filtros = {}) {
  return this.find({
    fecha: { $gte: fechaInicio, $lte: fechaFin },
    ...filtros
  })
    .populate('trabajador', 'nombre apellido documento')
    .populate('cuadrilla', 'nombre codigo')
    .populate('finca', 'nombre codigo')
    .populate('registrado_por', 'nombre apellido')
    .populate('aprobado_por', 'nombre apellido')
    .sort({ fecha: -1 });
};

// ✅ NUEVO: Obtener total de horas perdidas por lluvia en una finca y período
novedadSchema.statics.getHorasPerdidasLluvia = function (fincaId, fechaInicio, fechaFin) {
  return this.aggregate([
    {
      $match: {
        finca: fincaId,
        tipo: 'LLUVIA',
        estado: { $ne: 'RECHAZADA' },
        fecha: { $gte: new Date(fechaInicio), $lte: new Date(fechaFin) },
        horas: { $ne: null }
      }
    },
    {
      $group: {
        _id: '$finca',
        total_horas_perdidas: { $sum: '$horas' },
        cantidad_eventos: { $sum: 1 }
      }
    }
  ]);
};

// ✅ NUEVO: Obtener resumen de horas perdidas agrupado por tipo y fecha
novedadSchema.statics.getResumenHorasPerdidas = function (filtros = {}) {
  return this.aggregate([
    {
      $match: {
        horas: { $ne: null },
        estado: { $ne: 'RECHAZADA' },
        ...filtros
      }
    },
    {
      $group: {
        _id: { tipo: '$tipo', fecha: { $dateToString: { format: '%Y-%m-%d', date: '$fecha' } } },
        total_horas: { $sum: '$horas' },
        cantidad: { $sum: 1 }
      }
    },
    { $sort: { '_id.fecha': -1 } }
  ]);
};

const Novedad = mongoose.model('Novedad', novedadSchema);

module.exports = Novedad;