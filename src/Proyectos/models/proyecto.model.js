/**
 * proyecto.model.js
 * Ruta: src/Proyectos/models/proyecto.model.js
 *
 * ✅ Sin ObjectId
 * ✅ Sin ref
 * ✅ Sin _id en subdocumentos
 * ✅ 100% objetos embebidos planos
 */

const mongoose = require('mongoose');
const { ESTADOS_PROYECTO, TIPOS_CONTRATO } = require('../../config/constants');

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

    // ✅ Cliente como referencia ObjectId
    cliente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cliente',
      required: [true, 'El cliente es obligatorio'],
    },

    // ✅ Zona como objeto plano embebido
    zona: {
      nombre: { type: String, trim: true, default: null },
      codigo: { type: String, trim: true, default: null },
    },

    fecha_inicio:       { type: Date, required: true },
    fecha_fin_estimada: { type: Date },
    fecha_fin_real:     { type: Date },

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

    // ✅ Actividades por intervención — array de objetos planos
    actividades_por_intervencion: {
      mantenimiento: [
        {
          nombre:          { type: String, trim: true, default: '' },
          precio_unitario: { type: Number, default: 0, min: 0 },
          cantidad:        { type: Number, default: 0, min: 0 },
          unidad:          { type: String, default: 'hectareas', trim: true },
          estado:          { type: String, default: 'Pendiente', trim: true },
        },
      ],
      no_programadas: [
        {
          nombre:          { type: String, trim: true, default: '' },
          precio_unitario: { type: Number, default: 0, min: 0 },
          cantidad:        { type: Number, default: 0, min: 0 },
          unidad:          { type: String, default: 'hectareas', trim: true },
          estado:          { type: String, default: 'Pendiente', trim: true },
        },
      ],
      establecimiento: [
        {
          nombre:          { type: String, trim: true, default: '' },
          precio_unitario: { type: Number, default: 0, min: 0 },
          cantidad:        { type: Number, default: 0, min: 0 },
          unidad:          { type: String, default: 'hectareas', trim: true },
          estado:          { type: String, default: 'Pendiente', trim: true },
        },
      ],
    },

    estado: {
      type:    String,
      enum:    Object.values(ESTADOS_PROYECTO),
      default: ESTADOS_PROYECTO.PLANEADO,
    },

    // ✅ Responsable como objeto plano embebido
    responsable: {
      nombre:    { type: String, trim: true, default: null },
      documento: { type: String, trim: true, default: null },
      cargo:     { type: String, trim: true, default: null },
    },

    observaciones: { type: String, trim: true },
    total_actividades: { type: Number, default: 0, min: 0 },
    total_proyecto: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, versionKey: false }
);

// ── PRE-SAVE: Calcular totales de presupuesto ─────────────────
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

  // Calcular totales globales del proyecto (suma de todas las intervenciones + actividades planificadas)
  const totalCantidadIntervenciones = (m.cantidadTotal || 0) + (n.cantidadTotal || 0) + (e.cantidadTotal || 0);
  const totalMontoIntervenciones    = (m.montoTotal || 0) + (n.montoTotal || 0) + (e.montoTotal || 0);

  // Además sumar las actividades planas en `actividades` si existen
  const actividadesPlanas = this.actividades || [];
  const flat = actividadesPlanas.reduce(
    (acc, a) => {
      const cantidad = Number(a.cantidad) || 0;
      const precio   = Number(a.precio_unitario) || 0;
      acc.cantidad += cantidad;
      acc.monto    += cantidad * precio;
      return acc;
    },
    { cantidad: 0, monto: 0 }
  );

  this.total_actividades = totalCantidadIntervenciones + flat.cantidad;
  this.total_proyecto    = Number((totalMontoIntervenciones + flat.monto).toFixed(2));
});

module.exports = mongoose.model('Proyecto', proyectoSchema);