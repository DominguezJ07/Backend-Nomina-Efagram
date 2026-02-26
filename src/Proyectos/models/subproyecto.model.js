const mongoose = require('mongoose');

const subproyectoSchema = new mongoose.Schema(
  {
    codigo: {
      type: String,
      required: [true, 'El código es obligatorio'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
    },
    proyecto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Proyecto',
      required: [true, 'El proyecto es obligatorio'],
    },
    // Núcleos asignados (deben pertenecer a la zona del proyecto)
    nucleos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Nucleo',
      },
    ],
    supervisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Persona',
    },
    cliente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cliente',
    },
    fecha_inicio: {
      type: Date,
    },
    fecha_fin_estimada: {
      type: Date,
    },
    estado: {
      type: String,
      enum: ['ACTIVO', 'CERRADO', 'CANCELADO'],
      default: 'ACTIVO',
    },
    observaciones: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true, versionKey: false }
);

// Índices
subproyectoSchema.index({ proyecto: 1 });
subproyectoSchema.index({ proyecto: 1, estado: 1 });
subproyectoSchema.index({ codigo: 1 }, { unique: true });

subproyectoSchema.set('toJSON', { virtuals: true });
subproyectoSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Subproyecto', subproyectoSchema);