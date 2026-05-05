/**
 * proyecto.model.js
 * Ruta: src/Proyectos/models/proyecto.model.js
 */

const mongoose = require('mongoose');
const { ESTADOS_PROYECTO, TIPOS_CONTRATO } = require('../../config/constants');
const {
  PersonaSchema,
  ZonaSchema,
  ClienteRefSchema,
} = require('../schemas/embeddedSchemas');

// Subdocumento interno: actividad por tipo de intervención
// (este no viene de API externa, es propio del proyecto)
const actividadIntervencionSchema = new mongoose.Schema(
  {
    nombre:          { type: String, required: true, trim: true },
    precio_unitario: { type: Number, default: 0, min: 0 },
    cantidad:        { type: Number, default: 0, min: 0 },
    unidad:          { type: String, default: 'hectareas', trim: true },
    estado:          { type: String, default: 'Pendiente', trim: true },
  },
  { _id: false }
);

const proyectoSchema = new mongoose.Schema(
  {
    codigo: {
      type:      String,
      required:  true,
      unique:    true,
      uppercase: true,
      trim:      true,
    },
    nombre: {
      type:     String,
      required: true,
      trim:     true,
    },
    descripcion: { type: String, trim: true },

    // ✅ Cliente embebido — referencia liviana, estandarizada
    cliente: {
      type:     ClienteRefSchema,
      required: [true, 'El cliente es obligatorio'],
    },

    // ✅ Zona embebida — viene de API externa, estandarizada
    zona: {
      type:    ZonaSchema,
      default: null,
    },

    fecha_inicio:        { type: Date, required: true },
    fecha_fin_estimada:  { type: Date },
    fecha_fin_real:      { type: Date },

    tipo_contrato: {
      type:    String,
      enum:    Object.values(TIPOS_CONTRATO),
      default: TIPOS_CONTRATO.FIJO_TODO_COSTO,
    },

    valor_contrato: { type: Number, min: 0 },

    presupuesto_por_intervencion: {
      mantenimiento: {
        cantidad_actividades: { type: Number, default: 0, min: 0 },
        monto_presupuestado:  { type: Number, default: 0, min: 0 },
      },
      no_programadas: {
        cantidad_actividades: { type: Number, default: 0, min: 0 },
        monto_presupuestado:  { type: Number, default: 0, min: 0 },
      },
      establecimiento: {
        cantidad_actividades: { type: Number, default: 0, min: 0 },
        monto_presupuestado:  { type: Number, default: 0, min: 0 },
      },
    },

    actividades_por_intervencion: {
      mantenimiento:   { type: [actividadIntervencionSchema], default: [] },
      no_programadas:  { type: [actividadIntervencionSchema], default: [] },
      establecimiento: { type: [actividadIntervencionSchema], default: [] },
    },

    estado: {
      type:    String,
      enum:    Object.values(ESTADOS_PROYECTO),
      default: ESTADOS_PROYECTO.PLANEADO,
    },

    // ✅ Responsable embebido — viene de API externa, estandarizado
    responsable: {
      type:    PersonaSchema,
      default: null,
    },

    observaciones: { type: String, trim: true },
  },
  { timestamps: true, versionKey: false }
);

// ── PRE-SAVE: Calcular totales de presupuesto ─────────────────────────
function calcTotales(acts = []) {
  return {
    cantidadTotal: acts.reduce((s, a) => s + (Number(a.cantidad) || 0), 0),
    montoTotal:    acts.reduce(
      (s, a) => s + ((Number(a.precio_unitario) || 0) * (Number(a.cantidad) || 0)),
      0
    ),
  };
}

proyectoSchema.pre('save', function () {
  if (this.fecha_fin_estimada && this.fecha_fin_estimada < this.fecha_inicio) {
    throw new Error('La fecha fin estimada no puede ser menor a la fecha de inicio');
  }
  if (this.fecha_fin_real && this.fecha_fin_real < this.fecha_inicio) {
    throw new Error('La fecha fin real no puede ser menor a la fecha de inicio');
  }

  const acts = this.actividades_por_intervencion || {};
  const m    = calcTotales(acts.mantenimiento    || []);
  const n    = calcTotales(acts.no_programadas   || []);
  const e    = calcTotales(acts.establecimiento  || []);

  this.presupuesto_por_intervencion = {
    mantenimiento:   { cantidad_actividades: m.cantidadTotal, monto_presupuestado: m.montoTotal },
    no_programadas:  { cantidad_actividades: n.cantidadTotal, monto_presupuestado: n.montoTotal },
    establecimiento: { cantidad_actividades: e.cantidadTotal, monto_presupuestado: e.montoTotal },
  };
});

module.exports = mongoose.model('Proyecto', proyectoSchema);