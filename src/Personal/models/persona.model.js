const mongoose = require('mongoose');

const personaSchema = new mongoose.Schema({
  // Relación con User (opcional - no todos los usuarios tienen persona)
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Datos personales
  tipo_doc: {
    type: String,
    required: [true, 'El tipo de documento es obligatorio'],
    enum: ['CC', 'CE', 'TI', 'PA'],
    default: 'CC'
  },
  num_doc: {
    type: String,
    required: [true, 'El número de documento es obligatorio'],
    unique: true,
    trim: true
  },
  nombres: {
    type: String,
    required: [true, 'Los nombres son obligatorios'],
    trim: true
  },
  apellidos: {
    type: String,
    required: [true, 'Los apellidos son obligatorios'],
    trim: true
  },
  
  // Datos de contacto
  telefono: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  direccion: {
    type: String,
    trim: true
  },
  
  // Datos laborales
  fecha_ingreso: {
    type: Date,
    default: Date.now
  },
  tipo_contrato: {
    type: String,
    enum: ['INDEFINIDO', 'FIJO', 'OBRA_LABOR', 'APRENDIZ', 'TEMPORAL'],
    default: 'OBRA_LABOR'
  },
  cargo: {
    type: String,
    trim: true
  },
  
  // Datos bancarios
  banco: {
    type: String,
    trim: true
  },
  tipo_cuenta: {
    type: String,
    enum: ['AHORROS', 'CORRIENTE'],
    default: 'AHORROS'
  },
  numero_cuenta: {
    type: String,
    trim: true
  },
  
  // EPS, ARL, Pensión
  eps: {
    type: String,
    trim: true
  },
  arl: {
    type: String,
    trim: true
  },
  fondo_pension: {
    type: String,
    trim: true
  },
  
  // Estado
  estado: {
    type: String,
    enum: ['ACTIVO', 'INACTIVO', 'RETIRADO', 'SUSPENDIDO'],
    default: 'ACTIVO'
  },
  fecha_retiro: {
    type: Date,
    default: null
  },
  motivo_retiro: {
    type: String,
    trim: true
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
personaSchema.index({ num_doc: 1 });
personaSchema.index({ usuario: 1 });
personaSchema.index({ estado: 1 });

// Virtual para nombre completo
personaSchema.virtual('nombreCompleto').get(function() {
  return `${this.nombres} ${this.apellidos}`;
});

// Método estático para buscar personas activas
personaSchema.statics.findActivos = function() {
  return this.find({ estado: 'ACTIVO' }).sort({ apellidos: 1 });
};

// Método para obtener datos públicos
personaSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    num_doc: this.num_doc,
    nombreCompleto: this.nombreCompleto,
    telefono: this.telefono,
    email: this.email,
    cargo: this.cargo,
    estado: this.estado,
    fecha_ingreso: this.fecha_ingreso
  };
};

personaSchema.set('toJSON', { virtuals: true });
personaSchema.set('toObject', { virtuals: true });

const Persona = mongoose.model('Persona', personaSchema);

module.exports = Persona;