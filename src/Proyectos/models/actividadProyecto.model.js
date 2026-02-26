const mongoose = require('mongoose');

const actividadProyectoSchema = new mongoose.Schema(
  {
    proyecto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Proyecto',
      required: [true, 'El proyecto es obligatorio'],
    },
    actividad: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ActividadCatalogo',
      required: [true, 'La actividad es obligatoria'],
    },
    intervencion: {
      type: String,
      enum: ['mantenimiento', 'no_programadas', 'establecimiento'],
      required: [true, 'El tipo de intervención es obligatorio'],
    },
    cliente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cliente',
    },
    supervisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Persona',
    },
    precio_unitario: {
      type: Number,
      default: 0,
      min: [0, 'El precio no puede ser negativo'],
    },
    cantidad_total: {
      type: Number,
      required: [true, 'La cantidad total es obligatoria'],
      min: [0.01, 'La cantidad total debe ser mayor a 0'],
    },
    cantidad_asignada: {
      type: Number,
      default: 0,
      min: [0, 'La cantidad asignada no puede ser negativa'],
    },
    estado: {
      type: String,
      enum: ['ABIERTA', 'CERRADA'],
      default: 'ABIERTA',
    },
    unidad: {
      type: String,
      trim: true,
      default: 'UNIDAD',
    },
    observaciones: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true, versionKey: false }
);

// Índices
actividadProyectoSchema.index({ proyecto: 1, intervencion: 1 });
actividadProyectoSchema.index({ proyecto: 1, estado: 1 });
actividadProyectoSchema.index({ actividad: 1 });

// Virtual: porcentaje asignado
actividadProyectoSchema.virtual('porcentaje_asignado').get(function () {
  if (!this.cantidad_total || this.cantidad_total === 0) return 0;
  return Math.min(100, Math.round((this.cantidad_asignada / this.cantidad_total) * 100));
});

// Virtual: cantidad disponible
actividadProyectoSchema.virtual('cantidad_disponible').get(function () {
  return Math.max(0, this.cantidad_total - this.cantidad_asignada);
});

// Virtual: valor total
actividadProyectoSchema.virtual('valor_total').get(function () {
  return (this.precio_unitario || 0) * (this.cantidad_total || 0);
});

actividadProyectoSchema.set('toJSON', { virtuals: true });
actividadProyectoSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ActividadProyecto', actividadProyectoSchema);