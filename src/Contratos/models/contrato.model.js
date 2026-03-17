const mongoose = require('mongoose');

const actividadContratoSchema = new mongoose.Schema(
  {
    actividad: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ActividadCatalogo',
      required: [true, 'La actividad es obligatoria'],
    },
    asignacion_subproyecto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AsignacionActividad',
      default: null,
    },
    cantidad: {
      type: Number,
      required: [true, 'La cantidad es obligatoria'],
      min: [0.01, 'La cantidad debe ser mayor a 0'],
    },
    precio_unitario: {
      type: Number,
      required: [true, 'El precio unitario es obligatorio'],
      min: [0, 'El precio no puede ser negativo'],
    },
  },
  { _id: false }
);

actividadContratoSchema.virtual('valor_total').get(function () {
  return (this.precio_unitario || 0) * (this.cantidad || 0);
});

// ✅ NUEVO: Subdocumento de lote embebido en el contrato
const loteContratoSchema = new mongoose.Schema(
  {
    codigo: {
      type: Number,
      required: [true, 'El código del lote es obligatorio'],
      min: [1, 'El código del lote debe ser mayor a 0'],
    },
    nombre: {
      type: String,
      required: [true, 'El nombre del lote es obligatorio'],
      trim: true,
    },
  },
  { _id: true } // _id: true para poder referenciar cada lote por su ObjectId
);

const contratoSchema = new mongoose.Schema(
  {
    codigo: {
      type: String,
      required: [true, 'El código del contrato es obligatorio'],
      unique: true,
      uppercase: true,
      trim: true,
    },

    subproyecto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subproyecto',
      required: [true, 'El subproyecto es obligatorio'],
    },

    finca: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Finca',
      required: [true, 'La finca es obligatoria'],
    },

    // ✅ CAMBIO: lotes ahora son subdocumentos embebidos, no referencias a la colección Lote territorial
    lotes: {
      type: [loteContratoSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'Debe agregar al menos un lote',
      },
    },

    actividades: {
      type: [actividadContratoSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'Debe incluir al menos una actividad',
      },
    },

    cuadrillas: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cuadrilla' }],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'Debe asignar al menos una cuadrilla',
      },
    },

    fecha_inicio: {
      type: Date,
      required: [true, 'La fecha de inicio es obligatoria'],
    },
    fecha_fin: {
      type: Date,
      default: null,
    },

    estado: {
      type: String,
      enum: ['BORRADOR', 'ACTIVO', 'CERRADO', 'CANCELADO'],
      default: 'ACTIVO',
    },

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

// ✅ Validación: códigos de lotes únicos dentro del mismo contrato
contratoSchema.pre('save', function () {
  if (this.lotes && this.lotes.length > 0) {
    const codigos = this.lotes.map((l) => l.codigo);
    const codigosUnicos = new Set(codigos);
    if (codigosUnicos.size !== codigos.length) {
      throw new Error('Los códigos de los lotes deben ser únicos dentro del contrato');
    }
  }
});

contratoSchema.pre('save', function () {
  if (this.fecha_fin && this.fecha_fin <= this.fecha_inicio) {
    throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
  }
});

contratoSchema.index({ codigo: 1 }, { unique: true });
contratoSchema.index({ subproyecto: 1 });
contratoSchema.index({ finca: 1 });
contratoSchema.index({ cuadrillas: 1 });
contratoSchema.index({ estado: 1 });
contratoSchema.index({ fecha_inicio: 1 });

contratoSchema.virtual('valor_total').get(function () {
  return (this.actividades || []).reduce(
    (sum, a) => sum + (a.precio_unitario || 0) * (a.cantidad || 0),
    0
  );
});

contratoSchema.set('toJSON', { virtuals: true });
contratoSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Contrato', contratoSchema);