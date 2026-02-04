const mongoose = require('mongoose');

const proyectoLoteSchema = new mongoose.Schema({
  proyecto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proyecto',
    required: [true, 'El proyecto es obligatorio']
  },
  lote: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lote',
    required: [true, 'El lote es obligatorio']
  },
  fecha_asignacion: {
    type: Date,
    default: Date.now
  },
  fecha_inicio: {
    type: Date
  },
  fecha_fin: {
    type: Date
  },
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

// Índice compuesto único: un lote no puede estar en el mismo proyecto dos veces activamente
proyectoLoteSchema.index({ proyecto: 1, lote: 1, activo: 1 }, { unique: true });

const ProyectoLote = mongoose.model('ProyectoLote', proyectoLoteSchema);

module.exports = ProyectoLote;