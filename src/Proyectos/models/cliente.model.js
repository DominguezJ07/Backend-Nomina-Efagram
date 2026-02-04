const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: [true, 'El código es obligatorio'],
    unique: true,
    uppercase: true,
    trim: true
  },
  nit: {
    type: String,
    required: [true, 'El NIT es obligatorio'],
    unique: true,
    trim: true
  },
  razon_social: {
    type: String,
    required: [true, 'La razón social es obligatoria'],
    trim: true
  },
  nombre_comercial: {
    type: String,
    trim: true
  },
  // Contacto
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
  ciudad: {
    type: String,
    trim: true
  },
  // Contacto principal
  contacto_nombre: {
    type: String,
    trim: true
  },
  contacto_telefono: {
    type: String,
    trim: true
  },
  contacto_email: {
    type: String,
    trim: true,
    lowercase: true
  },
  // Estado
  activo: {
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
clienteSchema.index({ codigo: 1 });
clienteSchema.index({ nit: 1 });
clienteSchema.index({ activo: 1 });

// Virtual para proyectos del cliente
clienteSchema.virtual('proyectos', {
  ref: 'Proyecto',
  localField: '_id',
  foreignField: 'cliente'
});

clienteSchema.set('toJSON', { virtuals: true });
clienteSchema.set('toObject', { virtuals: true });

const Cliente = mongoose.model('Cliente', clienteSchema);

module.exports = Cliente;