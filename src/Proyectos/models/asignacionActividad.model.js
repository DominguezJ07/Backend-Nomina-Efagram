const mongoose = require('mongoose');

const asignacionActividadSchema = new mongoose.Schema(
  {
    subproyecto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subproyecto',
      required: [true, 'El subproyecto es obligatorio'],
    },
    actividad_proyecto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ActividadProyecto',
      required: [true, 'La actividad del proyecto es obligatoria'],
    },
    cantidad_asignada: {
      type: Number,
      required: [true, 'La cantidad asignada es obligatoria'],
      min: [0.01, 'La cantidad debe ser mayor a 0'],
    },
    estado: {
      type: String,
      enum: ['PENDIENTE', 'EN_EJECUCION', 'COMPLETADA', 'CANCELADA'],
      default: 'PENDIENTE',
    },
    observaciones: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true, versionKey: false }
);

// Índices
asignacionActividadSchema.index({ subproyecto: 1 });
asignacionActividadSchema.index({ actividad_proyecto: 1 });
asignacionActividadSchema.index({ subproyecto: 1, actividad_proyecto: 1 });

// Virtual: porcentaje que representa esta asignación (se calcula en el service)
asignacionActividadSchema.virtual('porcentaje').get(function () {
  // Se calcula dinámicamente en el controller usando cantidad_total de ActividadProyecto
  return null;
});

asignacionActividadSchema.set('toJSON', { virtuals: true });
asignacionActividadSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('AsignacionActividad', asignacionActividadSchema);