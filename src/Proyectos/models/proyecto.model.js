const mongoose = require('mongoose');
const { ESTADOS_PROYECTO, TIPOS_CONTRATO } = require('../../config/constants');

const proyectoSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: [true, 'El código es obligatorio'],
    unique: true,
    uppercase: true,
    trim: true
  },
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true
  },
  descripcion: {
    type: String,
    trim: true
  },
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: [true, 'El cliente es obligatorio']
  },
  // Fechas
  fecha_inicio: {
    type: Date,
    required: [true, 'La fecha de inicio es obligatoria']
  },
  fecha_fin_estimada: {
    type: Date
  },
  fecha_fin_real: {
    type: Date
  },
  // Financiero
  tipo_contrato: {
    type: String,
    enum: Object.values(TIPOS_CONTRATO),
    default: TIPOS_CONTRATO.FIJO_TODO_COSTO
  },
  valor_contrato: {
    type: Number,
    min: 0
  },
  // Estado
  estado: {
    type: String,
    enum: Object.values(ESTADOS_PROYECTO),
    default: ESTADOS_PROYECTO.PLANEADO
  },
  // Control
  responsable: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona'
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
proyectoSchema.index({ codigo: 1 });
proyectoSchema.index({ cliente: 1 });
proyectoSchema.index({ estado: 1 });
proyectoSchema.index({ fecha_inicio: 1 });

// Validación: fecha fin no puede ser menor a fecha inicio
proyectoSchema.pre('save', function() {
  if (this.fecha_fin_estimada && this.fecha_fin_estimada < this.fecha_inicio) {
    throw new Error('La fecha fin estimada no puede ser menor a la fecha de inicio');
  }
  if (this.fecha_fin_real && this.fecha_fin_real < this.fecha_inicio) {
    throw new Error('La fecha fin real no puede ser menor a la fecha de inicio');
  }
});

const Proyecto = mongoose.model('Proyecto', proyectoSchema); 
 
module.exports = Proyecto;