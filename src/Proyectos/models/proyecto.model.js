const mongoose = require('mongoose');
const { ESTADOS_PROYECTO, TIPOS_CONTRATO } = require('../../config/constants');

// ✅ Subdocumento: Actividad por intervención
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

const proyectoSchema = new mongoose.Schema(
  {
    codigo: { type: String, required: true, unique: true, uppercase: true, trim: true },
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, trim: true },

    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },

    fecha_inicio: { type: Date, required: true },
    fecha_fin_estimada: { type: Date },
    fecha_fin_real: { type: Date },

    tipo_contrato: {
      type: String,
      enum: Object.values(TIPOS_CONTRATO),
      default: TIPOS_CONTRATO.FIJO_TODO_COSTO,
    },

    valor_contrato: { type: Number, min: 0 },

    // ✅ Totales (ya los tenías)
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

    // ✅ NUEVO: Guardar actividades reales
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

// ✅ Recalcular totales desde actividades (recomendado para consistencia)
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

  // ✅ Siempre recalcular totales desde las actividades guardadas
  const acts = this.actividades_por_intervencion || {};

  const m = calcTotales(acts.mantenimiento || []);
  const n = calcTotales(acts.no_programadas || []);
  const e = calcTotales(acts.establecimiento || []);

  this.presupuesto_por_intervencion = {
    mantenimiento: { cantidad_actividades: m.cantidadTotal, monto_presupuestado: m.montoTotal },
    no_programadas: { cantidad_actividades: n.cantidadTotal, monto_presupuestado: n.montoTotal },
    establecimiento: { cantidad_actividades: e.cantidadTotal, monto_presupuestado: e.montoTotal },
  };
});

module.exports = mongoose.model('Proyecto', proyectoSchema);
