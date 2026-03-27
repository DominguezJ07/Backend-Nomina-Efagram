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

    // ✅ Ahora la actividad se liga directamente a una intervención
    intervencion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Intervencion',
      required: [true, 'La intervención es obligatoria']
    },

    // ⚠️ Se deja temporalmente opcional por compatibilidad
    categoria: {
      type: String,
      trim: true,
      default: null
    },

    // ⚠️ Ya no se usará en frontend, pero se deja opcional
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

    descripcion: {
      type: String,
      trim: true,
      default: ''
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