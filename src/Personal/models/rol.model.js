const mongoose = require('mongoose');

const rolSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: [true, 'El código es obligatorio'],
    unique: true,
    uppercase: true,
    trim: true
    // Removí el enum para permitir cualquier código
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
  permisos: [{
    type: String,
    trim: true
  }],
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Índices
rolSchema.index({ codigo: 1 });

const Rol = mongoose.model('Rol', rolSchema);

module.exports = Rol;