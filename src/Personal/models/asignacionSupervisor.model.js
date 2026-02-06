const mongoose = require('mongoose');

const asignacionSupervisorSchema = new mongoose.Schema({
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: [true, 'El supervisor es obligatorio']
  },
  lote: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lote',
    required: [true, 'El lote es obligatorio']
  },
  fecha_inicio: {
    type: Date,
    required: [true, 'La fecha de inicio es obligatoria'],
    default: Date.now
  },
  fecha_fin: {
    type: Date,
    default: null
  },
  activa: {
    type: Boolean,
    default: true
  },
  observaciones: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Índices para búsquedas eficientes
asignacionSupervisorSchema.index({ supervisor: 1, activa: 1 });
asignacionSupervisorSchema.index({ lote: 1, activa: 1 });
asignacionSupervisorSchema.index({ fecha_inicio: -1 });

// ✅ ELIMINADO: El middleware pre-save que causaba problemas
// La validación de asignación única se hace en el controlador

// Método para finalizar asignación
asignacionSupervisorSchema.methods.finalizar = function(fechaFin = new Date()) {
  this.activa = false;
  this.fecha_fin = fechaFin;
  return this.save();
};

// Virtual para calcular duración
asignacionSupervisorSchema.virtual('duracion_dias').get(function() {
  if (!this.fecha_fin) return null;
  const diff = this.fecha_fin - this.fecha_inicio;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

asignacionSupervisorSchema.set('toJSON', { virtuals: true });
asignacionSupervisorSchema.set('toObject', { virtuals: true });

const AsignacionSupervisor = mongoose.model('AsignacionSupervisor', asignacionSupervisorSchema);

module.exports = AsignacionSupervisor;