const mongoose = require('mongoose');
const { ESTADOS_PROYECTO, TIPOS_CONTRATO } = require('../../config/constants');

// Subdocumento: Actividad por intervención
const actividadSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    precio_unitario: { type: Number, default: 0, min: 0 },
    cantidad: { type: Number, default: 0, min: 0 },
    unidad: { type: String, default: 'hectareas', trim: true },
    estado: { type: String, default: 'Pendiente', trim: true },
  },
  { _id: false }
);

// ✅ NUEVO: Subdocumento de Lote embebido en el proyecto
const loteProyectoSchema = new mongoose.Schema(
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
  { _id: true } // _id: true para poder referenciar cada lote por su ObjectId desde el PAL
);

const proyectoSchema = new mongoose.Schema(
  {
    codigo: { type: String, required: true, unique: true, uppercase: true, trim: true },
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, trim: true },

    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },

    zona: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zona',
      default: null,
    },

    // ✅ NUEVO: Lotes propios del proyecto (no dependen de la jerarquía territorial)
    lotes: {
      type: [loteProyectoSchema],
      default: [],
    },

    fecha_inicio: { type: Date, required: true },
    fecha_fin_estimada: { type: Date },
    fecha_fin_real: { type: Date },

    tipo_contrato: {
      type: String,
      enum: Object.values(TIPOS_CONTRATO),
      default: TIPOS_CONTRATO.FIJO_TODO_COSTO,
    },

    valor_contrato: { type: Number, min: 0 },

    presupuesto_por_intervencion: {
      mantenimiento: {
        cantidad_actividades: { type: Number, default: 0, min: 0 },
        monto_presupuestado: { type: Number, default: 0, min: 0 },
      },
      no_programadas: {
        cantidad_actividades: { type: Number, default: 0, min: 0 },
        monto_presupuestado: { type: Number, default: 0, min: 0 },
      },
      establecimiento: {
        cantidad_actividades: { type: Number, default: 0, min: 0 },
        monto_presupuestado: { type: Number, default: 0, min: 0 },
      },
    },

    actividades_por_intervencion: {
      mantenimiento: { type: [actividadSchema], default: [] },
      no_programadas: { type: [actividadSchema], default: [] },
      establecimiento: { type: [actividadSchema], default: [] },
    },

    estado: {
      type: String,
      enum: Object.values(ESTADOS_PROYECTO),
      default: ESTADOS_PROYECTO.PLANEADO,
    },

    responsable: { type: mongoose.Schema.Types.ObjectId, ref: 'Persona' },
    observaciones: { type: String, trim: true },
  },
  { timestamps: true, versionKey: false }
);

// ✅ Validación: códigos de lotes únicos dentro del mismo proyecto
proyectoSchema.pre('save', function () {
  if (this.lotes && this.lotes.length > 0) {
    const codigos = this.lotes.map((l) => l.codigo);
    const codigosUnicos = new Set(codigos);
    if (codigosUnicos.size !== codigos.length) {
      throw new Error('Los códigos de los lotes deben ser únicos dentro del proyecto');
    }
  }
});

function calcTotales(acts = []) {
  const cantidadTotal = acts.reduce((s, a) => s + (Number(a.cantidad) || 0), 0);
  const montoTotal = acts.reduce(
    (s, a) => s + ((Number(a.precio_unitario) || 0) * (Number(a.cantidad) || 0)),
    0
  );
  return { cantidadTotal, montoTotal };
}

proyectoSchema.pre('save', function () {
  if (this.fecha_fin_estimada && this.fecha_fin_estimada < this.fecha_inicio) {
    throw new Error('La fecha fin estimada no puede ser menor a la fecha de inicio');
  }
  if (this.fecha_fin_real && this.fecha_fin_real < this.fecha_inicio) {
    throw new Error('La fecha fin real no puede ser menor a la fecha de inicio');
  }

  const acts = this.actividades_por_intervencion || {};
  const m = calcTotales(acts.mantenimiento || []);
  const n = calcTotales(acts.no_programadas || []);
  const e = calcTotales(acts.establecimiento || []);

  this.presupuesto_por_intervencion = {
    mantenimiento:  { cantidad_actividades: m.cantidadTotal, monto_presupuestado: m.montoTotal },
    no_programadas: { cantidad_actividades: n.cantidadTotal, monto_presupuestado: n.montoTotal },
    establecimiento:{ cantidad_actividades: e.cantidadTotal, monto_presupuestado: e.montoTotal },
  };
});

module.exports = mongoose.model('Proyecto', proyectoSchema);