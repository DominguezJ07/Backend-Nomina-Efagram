const mongoose = require('mongoose');

const actividadSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: true,
    unique: true
  },
  nombre: {
    type: String,
    required: true
  },
  categoria: {
    type: String
  },

  // 🔥 NUEVO CAMPO
  intervencion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Intervencion',
    required: true
  },

  estado: {
    type: String,
    enum: ['Activa', 'Inactiva'],
    default: 'Activa'
  },

  precioBase: Number,
  descripcion: String

}, { timestamps: true });

module.exports = mongoose.model('ActividadCatalogo', actividadSchema);