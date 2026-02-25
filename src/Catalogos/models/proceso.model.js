const mongoose = require('mongoose');

const procesoSchema = new mongoose.Schema(
  {
    codigo: {
      type: String,
      required: [true, 'El código es obligatorio'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [2, 'El código debe tener al menos 2 caracteres'],
      maxlength: [20, 'El código no puede superar 20 caracteres']
    },
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      minlength: [3, 'El nombre debe tener al menos 3 caracteres'],
      maxlength: [100, 'El nombre no puede superar 100 caracteres']
    },
    descripcion: {
      type: String,
      trim: true,
      maxlength: [500, 'La descripción no puede superar 500 caracteres']
    },
    activo: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Índices
procesoSchema.index({ codigo: 1 }, { unique: true });
procesoSchema.index({ activo: 1 });
procesoSchema.index({ nombre: 'text' });

// Virtual: intervenciones que usan este proceso
procesoSchema.virtual('intervenciones', {
  ref: 'Intervencion',
  localField: '_id',
  foreignField: 'proceso'
});

procesoSchema.set('toJSON', { virtuals: true });
procesoSchema.set('toObject', { virtuals: true });

const Proceso = mongoose.model('Proceso', procesoSchema);

module.exports = Proceso;