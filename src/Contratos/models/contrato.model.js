const mongoose = require('mongoose');

const contratoSchema = new mongoose.Schema(
  {
    // ── Identificación ──────────────────────────────────────────────
    codigo: {
      type: String,
      required: [true, 'El código del contrato es obligatorio'],
      unique: true,
      uppercase: true,
      trim: true,
    },

    // ── Ubicación ───────────────────────────────────────────────────
    finca: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Finca',
      required: [true, 'La finca es obligatoria'],
    },

    lotes: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Lote',
        },
      ],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'Debe seleccionar al menos un lote',
      },
    },

    // ── Actividades a ejecutar ──────────────────────────────────────
    actividades: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'ActividadCatalogo',
        },
      ],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'Debe seleccionar al menos una actividad',
      },
    },

    // ── Cuadrilla asignada ──────────────────────────────────────────
    cuadrilla: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cuadrilla',
      required: [true, 'La cuadrilla es obligatoria'],
    },

    // ── Vigencia ────────────────────────────────────────────────────
    fecha_inicio: {
      type: Date,
      required: [true, 'La fecha de inicio es obligatoria'],
    },
    fecha_fin: {
      type: Date,
      default: null,
    },

    // ── Estado ──────────────────────────────────────────────────────
    estado: {
      type: String,
      enum: ['BORRADOR', 'ACTIVO', 'CERRADO', 'CANCELADO'],
      default: 'ACTIVO',
    },

    // ── Trazabilidad ────────────────────────────────────────────────
    creado_por: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Persona',
      default: null,
    },

    observaciones: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true, versionKey: false }
);

// ── Índices ────────────────────────────────────────────────────────
contratoSchema.index({ codigo: 1 }, { unique: true });
contratoSchema.index({ finca: 1 });
contratoSchema.index({ cuadrilla: 1 });
contratoSchema.index({ estado: 1 });
contratoSchema.index({ fecha_inicio: 1 });

// ── Validación: fecha_fin posterior a fecha_inicio ─────────────────
contratoSchema.pre('save', function () {
  if (this.fecha_fin && this.fecha_fin <= this.fecha_inicio) {
    throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
  }
});

// ── Validación: lotes pertenecen a la finca seleccionada ──────────
contratoSchema.pre('save', async function () {
  if (this.isModified('lotes') || this.isModified('finca')) {
    const Lote = mongoose.model('Lote');
    const lotes = await Lote.find({ _id: { $in: this.lotes }, finca: this.finca });
    if (lotes.length !== this.lotes.length) {
      throw new Error('Uno o más lotes no pertenecen a la finca seleccionada');
    }
  }
});

contratoSchema.set('toJSON', { virtuals: true });
contratoSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Contrato', contratoSchema);