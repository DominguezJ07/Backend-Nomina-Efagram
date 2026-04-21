// src/Ejecucion/models/novedad.model.js

const mongoose = require('mongoose');
const { TIPOS_NOVEDAD } = require('../../config/constants');

const novedadSchema = new mongoose.Schema({

  // ─── IDENTIFICACIÓN ───────────────────────────────────────────────────────
  codigo: {
    type: String,
    required: [true, 'El código es obligatorio'],
    unique: true,
    uppercase: true,
    trim: true
  },

  // ─── FECHA ────────────────────────────────────────────────────────────────
  fecha: {
    type: Date,
    required: [true, 'La fecha es obligatoria'],
    index: true
  },

  // ─── TRABAJADOR / EMPLEADO ────────────────────────────────────────────────
  // Compatible con ambas versiones: ref unificada como 'Persona'
  trabajador: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: [true, 'El trabajador es obligatorio']
  },

  // ─── CUADRILLA ────────────────────────────────────────────────────────────
  cuadrilla: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cuadrilla',
    default: null  // opcional
  },

  // ─── FINCA ────────────────────────────────────────────────────────────────
  finca: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Finca',
    default: null
  },

  // ─── SUBPROYECTO (nuevo desde modelo Ejecucion) ───────────────────────────
  subproyecto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subproyecto',
    default: null
  },

  // ─── TIPO DE NOVEDAD ──────────────────────────────────────────────────────
  // Sincronizado con constants.js; se amplía con tipos del modelo Ejecucion
  tipo: {
    type: String,
    enum: Object.values(TIPOS_NOVEDAD),   // debe incluir NO_TRABAJADO, OTRO, LLUVIA, etc.
    required: [true, 'El tipo de novedad es obligatorio']
  },

  // ─── HORAS NO TRABAJADAS ──────────────────────────────────────────────────
  horas: {
    type: Number,
    default: null,  // opcional
    min: [0, 'Las horas no pueden ser negativas'],
    max: [24, 'Las horas no pueden superar 24'],
    validate: {
      validator: function (value) {
        if (value === null || value === undefined) return true;
        return value >= 0 && value <= 24;
      },
      message: 'Valor de horas inválido'
    }
  },

  // ─── DURACIÓN EN DÍAS (para novedades de días completos) ─────────────────
  dias: {
    type: Number,
    default: 1,
    min: [0.5, 'Mínimo medio día']
  },

  // ─── RANGO DE FECHAS ──────────────────────────────────────────────────────
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

  // ─── DESCRIPCIÓN / MOTIVO ─────────────────────────────────────────────────
  // `descripcion` (original) y `motivo` (Ejecucion) se unifican en `descripcion`
  descripcion: {
    type: String,
    required: [true, 'La descripción / motivo es obligatorio'],
    trim: true
  },

  // ─── AFECTA NÓMINA ────────────────────────────────────────────────────────
  afecta_nomina: {
    type: Boolean,
    default: true
  },

  // ─── DOCUMENTO DE SOPORTE ────────────────────────────────────────────────
  documento_soporte: {
    type: String,
    trim: true
  },

  // ─── REGISTRO ────────────────────────────────────────────────────────────
  registrado_por: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: [true, 'Quien registra es obligatorio']
  },

  // ─── APROBACIÓN ───────────────────────────────────────────────────────────
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

  // ─── ESTADO ───────────────────────────────────────────────────────────────
  estado: {
    type: String,
    enum: ['PENDIENTE', 'APROBADA', 'RECHAZADA', 'ANULADA'],
    default: 'PENDIENTE'
  },

  // ─── OBSERVACIONES ────────────────────────────────────────────────────────
  observaciones: {
    type: String,
    trim: true
  }

}, {
  timestamps: true,
  versionKey: false
});

// ============================================================================
// ÍNDICES
// ============================================================================

novedadSchema.index({ trabajador: 1, fecha: -1 });
novedadSchema.index({ tipo: 1, fecha: -1 });
novedadSchema.index({ estado: 1 });
novedadSchema.index({ codigo: 1 }, { unique: true });
novedadSchema.index({ cuadrilla: 1, fecha: -1 });
novedadSchema.index({ finca: 1, fecha: -1 });
novedadSchema.index({ subproyecto: 1, fecha: -1 });
novedadSchema.index({ tipo: 1, finca: 1, fecha: -1 });

// ============================================================================
// MÉTODOS DE INSTANCIA
// ============================================================================

/** Aprueba la novedad y la guarda */
novedadSchema.methods.aprobar = function (aprobadoPorId) {
  this.aprobado        = true;
  this.estado          = 'APROBADA';
  this.aprobado_por    = aprobadoPorId;
  this.fecha_aprobacion = new Date();
  return this.save();
};

/** Rechaza la novedad con un motivo y la guarda */
novedadSchema.methods.rechazar = function (aprobadoPorId, motivo) {
  this.aprobado         = false;
  this.estado           = 'RECHAZADA';
  this.aprobado_por     = aprobadoPorId;
  this.fecha_aprobacion = new Date();
  this.motivo_rechazo   = motivo;
  return this.save();
};

// ============================================================================
// MÉTODOS ESTÁTICOS
// ============================================================================

/**
 * Novedades de un período con filtros opcionales.
 * Popula trabajador, cuadrilla, finca, subproyecto, registrado_por y aprobado_por.
 */
novedadSchema.statics.getNovedadesPeriodo = function (fechaInicio, fechaFin, filtros = {}) {
  return this.find({
    fecha: { $gte: fechaInicio, $lte: fechaFin },
    ...filtros
  })
    .populate('trabajador',    'nombre apellido documento')
    .populate('cuadrilla',     'nombre codigo')
    .populate('finca',         'nombre codigo')
    .populate('subproyecto',   'nombre codigo')
    .populate('registrado_por','nombre apellido')
    .populate('aprobado_por',  'nombre apellido')
    .sort({ fecha: -1 });
};

/**
 * Total de horas perdidas por lluvia en una finca y período.
 * Excluye novedades RECHAZADAS y sin valor de horas.
 */
novedadSchema.statics.getHorasPerdidasLluvia = function (fincaId, fechaInicio, fechaFin) {
  return this.aggregate([
    {
      $match: {
        finca:  fincaId,
        tipo:   'LLUVIA',
        estado: { $ne: 'RECHAZADA' },
        fecha:  { $gte: new Date(fechaInicio), $lte: new Date(fechaFin) },
        horas:  { $ne: null }
      }
    },
    {
      $group: {
        _id:                  '$finca',
        total_horas_perdidas: { $sum: '$horas' },
        cantidad_eventos:     { $sum: 1 }
      }
    }
  ]);
};

/**
 * Resumen de horas perdidas agrupado por tipo y fecha.
 * Acepta filtros adicionales en el $match.
 */
novedadSchema.statics.getResumenHorasPerdidas = function (filtros = {}) {
  return this.aggregate([
    {
      $match: {
        horas:  { $ne: null },
        estado: { $ne: 'RECHAZADA' },
        ...filtros
      }
    },
    {
      $group: {
        _id: {
          tipo:  '$tipo',
          fecha: { $dateToString: { format: '%Y-%m-%d', date: '$fecha' } }
        },
        total_horas: { $sum: '$horas' },
        cantidad:    { $sum: 1 }
      }
    },
    { $sort: { '_id.fecha': -1 } }
  ]);
};

/**
 * Resumen de horas NO trabajadas agrupadas por cuadrilla y subproyecto.
 * Útil para reportes de ejecución de obra.
 */
novedadSchema.statics.getHorasPorCuadrillaSubproyecto = function (
  subproyectoId,
  fechaInicio,
  fechaFin
) {
  return this.aggregate([
    {
      $match: {
        subproyecto: subproyectoId,
        tipo:        'NO_TRABAJADO',
        estado:      { $ne: 'RECHAZADA' },
        fecha:       { $gte: new Date(fechaInicio), $lte: new Date(fechaFin) }
      }
    },
    {
      $group: {
        _id:          '$cuadrilla',
        total_horas:  { $sum: '$horas' },
        cantidad:     { $sum: 1 }
      }
    },
    { $sort: { total_horas: -1 } }
  ]);
};

// ============================================================================

const Novedad = mongoose.model('Novedad', novedadSchema);

module.exports = Novedad;