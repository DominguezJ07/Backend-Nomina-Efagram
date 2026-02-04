const mongoose = require('mongoose');

const asignacionSupervisorSchema = new mongoose.Schema({
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: [true, 'El supervisor es obligatorio']
  },
  // Alcance territorial
  zona: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zona',
    default: null
  },
  nucleo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Nucleo',
    required: [true, 'El núcleo es obligatorio']
  },
  finca: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Finca',
    default: null
  },
  lote: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lote',
    default: null
  },
  // Fechas
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

// Índices
asignacionSupervisorSchema.index({ supervisor: 1, activa: 1 });
asignacionSupervisorSchema.index({ nucleo: 1 });
asignacionSupervisorSchema.index({ finca: 1 });
asignacionSupervisorSchema.index({ lote: 1 });

// Validación: las fechas deben ser coherentes
asignacionSupervisorSchema.pre('save', function() {
  if (this.fecha_fin && this.fecha_fin < this.fecha_inicio) {
    throw new Error('La fecha fin no puede ser menor a la fecha de inicio');
  }
});

// Método estático para obtener asignaciones activas de un supervisor
asignacionSupervisorSchema.statics.getAsignacionesBySupervisor = function(supervisorId) {
  return this.find({ supervisor: supervisorId, activa: true })
    .populate('zona')
    .populate('nucleo')
    .populate('finca')
    .populate('lote');
};

// Método para verificar si un supervisor tiene acceso a un lote
asignacionSupervisorSchema.statics.tieneAcceso = async function(supervisorId, loteId) {
  const asignaciones = await this.find({ 
    supervisor: supervisorId, 
    activa: true 
  });
  
  for (const asig of asignaciones) {
    // Si está asignado al lote específico
    if (asig.lote && asig.lote.toString() === loteId.toString()) {
      return true;
    }
    
    // Si está asignado a la finca del lote
    // (requiere consultar el lote para saber su finca)
    // Esto se implementará en el servicio
  }
  
  return false;
};

const AsignacionSupervisor = mongoose.model('AsignacionSupervisor', asignacionSupervisorSchema);

module.exports = AsignacionSupervisor;