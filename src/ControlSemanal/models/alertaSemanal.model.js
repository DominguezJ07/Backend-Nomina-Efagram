const mongoose = require('mongoose');

const alertaSemanalSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: [true, 'El código es obligatorio'],
    unique: true,
    uppercase: true,
    trim: true
  },
  
  // Semana operativa
  semana_operativa: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SemanaOperativa',
    required: [true, 'La semana operativa es obligatoria']
  },
  
  // Tipo de alerta
  tipo: {
    type: String,
    enum: [
      'BAJO_RENDIMIENTO',
      'META_NO_CUMPLIDA',
      'ALTA_INASISTENCIA',
      'RETRASO_PROYECTO',
      'SOBRECOSTO',
      'OTRO'
    ],
    required: [true, 'El tipo de alerta es obligatorio']
  },
  
  // Nivel de criticidad
  nivel: {
    type: String,
    enum: ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'],
    required: [true, 'El nivel es obligatorio']
  },
  
  // Entidad afectada
  entidad_tipo: {
    type: String,
    enum: ['TRABAJADOR', 'PAL', 'PROYECTO', 'CUADRILLA'],
    required: [true, 'El tipo de entidad es obligatorio']
  },
  
  entidad_id: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'entidad_referencia',
    required: [true, 'La entidad es obligatoria']
  },
  
  entidad_referencia: {
    type: String,
    enum: ['Persona', 'ProyectoActividadLote', 'Proyecto', 'Cuadrilla']
  },
  
  // Descripción
  titulo: {
    type: String,
    required: [true, 'El título es obligatorio'],
    trim: true
  },
  
  descripcion: {
    type: String,
    required: [true, 'La descripción es obligatoria'],
    trim: true
  },
  
  // Valores relacionados
  valor_actual: {
    type: Number
  },
  
  valor_esperado: {
    type: Number
  },
  
  diferencia: {
    type: Number
  },
  
  // Acciones
  accion_sugerida: {
    type: String,
    trim: true
  },
  
  // Estado
  estado: {
    type: String,
    enum: ['PENDIENTE', 'EN_REVISION', 'RESUELTA', 'IGNORADA'],
    default: 'PENDIENTE'
  },
  
  // Resolución
  resuelto_por: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona'
  },
  
  fecha_resolucion: {
    type: Date
  },
  
  comentario_resolucion: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Índices
alertaSemanalSchema.index({ semana_operativa: 1, nivel: 1 });
alertaSemanalSchema.index({ estado: 1 });
alertaSemanalSchema.index({ entidad_tipo: 1, entidad_id: 1 });

// Método para resolver alerta
alertaSemanalSchema.methods.resolver = function(resueltoPorId, comentario) {
  this.estado = 'RESUELTA';
  this.resuelto_por = resueltoPorId;
  this.fecha_resolucion = new Date();
  this.comentario_resolucion = comentario;
  return this.save();
};

const AlertaSemanal = mongoose.model('AlertaSemanal', alertaSemanalSchema);

module.exports = AlertaSemanal;
