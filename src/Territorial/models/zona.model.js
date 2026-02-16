const mongoose = require('mongoose');

const zonaSchema = new mongoose.Schema({
  codigo: {
    type: Number,
    required: [true, 'El código de zona es obligatorio'],
    unique: true,
    min: [1, 'El código debe ser mayor o igual a 1'],
    max: [99, 'El código debe ser menor o igual a 99'],
    validate: {
      validator: Number.isInteger,
      message: 'El código debe ser un número entero'
    }
  }, 
  nombre: {
    type: String,
    required: [true, 'El nombre de la zona es obligatorio'],
    unique: true,
    trim: true
  },
  descripcion: {
    type: String,
    trim: true
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
  return this.findOne({ codigo: Number(codigo), activa: true });
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