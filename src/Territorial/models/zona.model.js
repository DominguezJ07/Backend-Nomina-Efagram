const mongoose = require('mongoose');

const zonaSchema = new mongoose.Schema({
  codigo: {
    type: String,  // Cambiado de Number a String
    required: [true, 'El código de zona es obligatorio'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^ZONA-\d{2}$/, 'El código debe tener el formato ZONA-XX (ej: ZONA-01)']
  }, 
  nombre: {
    type: String,
    required: [true, 'El nombre de la zona es obligatorio'],
    unique: true,
    trim: true
    // Eliminamos el enum para permitir cualquier nombre
  },
  descripcion: {  // Campo nuevo
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
  return this.findOne({ codigo: codigo.toUpperCase(), activa: true });
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