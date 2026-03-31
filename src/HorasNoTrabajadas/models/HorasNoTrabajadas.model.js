const mongoose = require('mongoose');

const HorasNoTrabajadasSchema = new mongoose.Schema({
  subproyectoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subproyecto',
    required: true
  },
  cuadrillaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cuadrilla',
    required: true
  },
  fecha: {
    type: Date,
    required: true
  },
  horas: {
    type: Number,
    required: true,
    min: 0,
    max: 24
  },
  motivo: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('HorasNoTrabajadas', HorasNoTrabajadasSchema);
