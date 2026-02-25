const mongoose = require('mongoose');

const intervencionSchema = new mongoose.Schema(
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
    proceso: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Proceso',
      required: [true, 'El proceso es obligatorio']
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
intervencionSchema.index({ codigo: 1 }, { unique: true });
intervencionSchema.index({ proceso: 1, activo: 1 });
intervencionSchema.index({ nombre: 'text' });

// Middleware pre-save: valida que el proceso exista y esté activo
intervencionSchema.pre('save', async function (next) {
  if (this.isModified('proceso')) {
    const Proceso = mongoose.model('Proceso');
    const procesoExiste = await Proceso.findById(this.proceso);

    if (!procesoExiste) {
      throw new Error('El proceso especificado no existe');
    }

    if (!procesoExiste.activo) {
      throw new Error('El proceso especificado está inactivo');
    }
  }
  next();
});

intervencionSchema.set('toJSON', { virtuals: true });
intervencionSchema.set('toObject', { virtuals: true });

const Intervencion = mongoose.model('Intervencion', intervencionSchema);

module.exports = Intervencion;