const mongoose = require('mongoose');

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
  
  // Tipo de novedad
  tipo: {
    type: String,
    enum: [
      'PERMISO',
      'AUSENCIA',
      'INCAPACIDAD',
      'ACCIDENTE_TRABAJO',
      'SUSPENSION',
      'VACACIONES',
      'LICENCIA',
      'OTRO'
    ],
    required: [true, 'El tipo de novedad es obligatorio']
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
  
  // Duración (en días)
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
    type: Date
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

// Índices
novedadSchema.index({ trabajador: 1, fecha: -1 });
novedadSchema.index({ tipo: 1, fecha: -1 });
novedadSchema.index({ estado: 1 });

// Validación: fecha_fin debe ser >= fecha_inicio
novedadSchema.pre('save', function() {
  if (this.fecha_inicio && this.fecha_fin && this.fecha_fin < this.fecha_inicio) {
    throw new Error('La fecha fin no puede ser anterior a la fecha inicio');
  }
});

// Método para aprobar
novedadSchema.methods.aprobar = function(aprobadoPorId) {
  this.aprobado = true;
  this.estado = 'APROBADA';
  this.aprobado_por = aprobadoPorId;
  this.fecha_aprobacion = new Date();
  return this.save();
};

// Método para rechazar
novedadSchema.methods.rechazar = function(aprobadoPorId, motivo) {
  this.aprobado = false;
  this.estado = 'RECHAZADA';
  this.aprobado_por = aprobadoPorId;
  this.fecha_aprobacion = new Date();
  this.motivo_rechazo = motivo;
  return this.save();
};

// Método estático para obtener novedades de un período
novedadSchema.statics.getNovedadesPeriodo = function(fechaInicio, fechaFin, filtros = {}) {
  return this.find({
    fecha: { $gte: fechaInicio, $lte: fechaFin },
    ...filtros
  })
    .populate('trabajador')
    .populate('registrado_por')
    .populate('aprobado_por')
    .sort({ fecha: -1 });
};

const Novedad = mongoose.model('Novedad', novedadSchema);

module.exports = Novedad;