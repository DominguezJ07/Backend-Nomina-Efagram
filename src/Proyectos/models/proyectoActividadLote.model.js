const mongoose = require('mongoose');
const { ESTADOS_PAL } = require('../../config/constants');

const proyectoActividadLoteSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: [true, 'El código es obligatorio'],
    unique: true,
    uppercase: true,
    trim: true
  },
  proyecto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proyecto',
    required: [true, 'El proyecto es obligatorio']
  },
  lote: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lote',
    required: [true, 'El lote es obligatorio']
  },
  actividad: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ActividadCatalogo',
    required: [true, 'La actividad es obligatoria']
  },
  // META MÍNIMA OBLIGATORIA (REGLA DE NEGOCIO CRÍTICA)
  meta_minima: {
    type: Number,
    required: [true, 'La meta mínima es obligatoria'],
    min: [0, 'La meta mínima no puede ser negativa']
  },
  cantidad_ejecutada: {
    type: Number,
    default: 0,
    min: [0, 'La cantidad ejecutada no puede ser negativa']
  },
  // Fechas
  fecha_inicio_planificada: {
    type: Date,
    required: [true, 'La fecha de inicio planificada es obligatoria']
  },
  fecha_fin_planificada: {
    type: Date
  },
  fecha_inicio_real: {
    type: Date
  },
  fecha_fin_real: {
    type: Date
  },
  // Estado
  estado: {
    type: String,
    enum: Object.values(ESTADOS_PAL),
    default: ESTADOS_PAL.PENDIENTE
  },
  // Control
  supervisor_asignado: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona'
  },
  prioridad: {
    type: Number,
    min: 1,
    max: 5,
    default: 3,
    comment: '1=Muy Alta, 5=Muy Baja'
  },
  observaciones: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Índices
proyectoActividadLoteSchema.index({ proyecto: 1 });
proyectoActividadLoteSchema.index({ lote: 1 });
proyectoActividadLoteSchema.index({ actividad: 1 });
proyectoActividadLoteSchema.index({ estado: 1 });
proyectoActividadLoteSchema.index({ codigo: 1 });

// TRIGGER: La meta mínima solo puede AUMENTAR, nunca disminuir
proyectoActividadLoteSchema.pre('save', function() {
  if (this.isModified('meta_minima') && !this.isNew) {
    const original = this._original || {};
    if (original.meta_minima && this.meta_minima < original.meta_minima) {
      throw new Error('La meta mínima solo puede aumentar, nunca disminuir');
    }
  }
});

// Middleware para guardar el valor original
proyectoActividadLoteSchema.post('init', function(doc) {
  doc._original = doc.toObject();
});

// VALIDACIÓN: No marcar como CUMPLIDA si no tiene meta
proyectoActividadLoteSchema.pre('save', function() {
  // Solo validar si el estado está cambiando a CUMPLIDA
  if (this.isModified('estado') && this.estado === ESTADOS_PAL.CUMPLIDA) {
    if (!this.meta_minima || this.meta_minima <= 0) {
      throw new Error('No se puede marcar como CUMPLIDA sin tener una meta mínima definida');
    }
    if (this.cantidad_ejecutada < this.meta_minima) {
      throw new Error('No se puede marcar como CUMPLIDA sin haber alcanzado la meta mínima');
    }
  }
});

// Virtual para calcular porcentaje de avance
proyectoActividadLoteSchema.virtual('porcentajeAvance').get(function() {
  if (!this.meta_minima || this.meta_minima === 0) return 0;
  return Math.round((this.cantidad_ejecutada / this.meta_minima) * 100);
});

// Virtual para saber si cumplió la meta
proyectoActividadLoteSchema.virtual('cumplioMeta').get(function() {
  return this.cantidad_ejecutada >= this.meta_minima;
});

proyectoActividadLoteSchema.set('toJSON', { virtuals: true });
proyectoActividadLoteSchema.set('toObject', { virtuals: true });

const ProyectoActividadLote = mongoose.model('ProyectoActividadLote', proyectoActividadLoteSchema);

module.exports = ProyectoActividadLote;