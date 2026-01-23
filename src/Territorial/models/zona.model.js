const mongoose = require('mongoose');
const { ZONAS } = require('../../config/constants');

const zonaSchema = new mongoose.Schema({
  codigo: {
    type: Number,
    required: [true, 'El código de zona es obligatorio'],
    unique: true,
    enum: {
      values: [1, 2, 3],
      message: 'El código debe ser 1 (Norte), 2 (Sur) o 3 (Centro)'
    }
  },
  nombre: {
    type: String,
    required: [true, 'El nombre de la zona es obligatorio'],
    unique: true,
    trim: true,
    enum: {
      values: ['Norte', 'Sur', 'Centro'],
      message: 'El nombre debe ser Norte, Sur o Centro'
    }
  },
  activa: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Índices
zonaSchema.index({ codigo: 1 });
zonaSchema.index({ nombre: 1 });

// Método para obtener zona por código
zonaSchema.statics.findByCodigo = function(codigo) {
  return this.findOne({ codigo, activa: true });
};

// Virtual para obtener núcleos de la zona
zonaSchema.virtual('nucleos', {
  ref: 'Nucleo',
  localField: '_id',
  foreignField: 'zona'
});

// Middleware para poblar núcleos al hacer toJSON
zonaSchema.set('toJSON', { virtuals: true });
zonaSchema.set('toObject', { virtuals: true });

const Zona = mongoose.model('Zona', zonaSchema);

module.exports = Zona;