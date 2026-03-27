const mongoose = require('mongoose');

const actividadCatalogoSchema = new mongoose.Schema(
  {
    codigo: {
      type: String,
      required: [true, 'El código es obligatorio'],
      unique: true,
      uppercase: true,
      trim: true
    },
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true
    },
    descripcion: {
      type: String,
      trim: true,
      default: ''
    },

    // ✅ La actividad queda ligada a una intervención
    intervencion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Intervencion',
      required: [true, 'La intervención es obligatoria']
    },

    // ⚠️ Compatibilidad temporal
    categoria: {
      type: String,
      trim: true,
      default: null
    },

    // ⚠️ Compatibilidad temporal
    unidad_medida: {
      type: String,
      trim: true,
      default: null
    },

    precio_base: {
      type: Number,
      default: 0,
      min: [0, 'El precio base no puede ser negativo']
    },

    rendimiento_diario_estimado: {
      type: Number,
      min: 0,
      default: null
    },

    activa: {
      type: Boolean,
      default: true
    },

    observaciones: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

actividadCatalogoSchema.index({ codigo: 1 }, { unique: true });
actividadCatalogoSchema.index({ activa: 1, intervencion: 1 });
actividadCatalogoSchema.index({ nombre: 'text', codigo: 'text' });

module.exports = mongoose.model('ActividadCatalogo', actividadCatalogoSchema);