/**
 * proyectoActividadLote.model.js
 * Ruta: src/Proyectos/models/proyectoActividadLote.model.js
 *
 * ✅ Sin ObjectId en subdocumentos externos
 * ✅ Sin populate
 * ✅ Lote y actividad como objetos planos embebidos
 * ⚠️ proyecto mantiene ObjectId — es modelo INTERNO del backend
 *    necesario para buscar PALs por proyecto eficientemente
 */

const mongoose = require('mongoose');
const { ESTADOS_PAL } = require('../../config/constants');

const proyectoActividadLoteSchema = new mongoose.Schema(
  {
    codigo: {
      type:      String,
      required:  [true, 'El código es obligatorio'],
      unique:    true,
      uppercase: true,
      trim:      true,
    },

    // ⚠️ EXCEPCIÓN JUSTIFICADA: proyecto es modelo interno de este backend
    // Sin este ObjectId no podemos hacer: find({ proyecto: proyectoId })
    proyecto: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Proyecto',
      required: [true, 'El proyecto es obligatorio'],
    },

    // ✅ Lote como objeto plano embebido — viene de API externa
    lote: {
      nombre: { type: String, required: true, trim: true },
      codigo: { type: String, trim: true, default: '' },
    },

    // ✅ Actividad como objeto plano embebido — viene de API externa
    actividad: {
      nombre: { type: String, required: true, trim: true },
      codigo: { type: String, trim: true, default: '' },
      unidad: { type: String, trim: true, default: 'hectareas' },
    },

    // ✅ Supervisor como objeto plano embebido — viene de API externa
    supervisor_asignado: {
      nombre:    { type: String, trim: true, default: null },
      documento: { type: String, trim: true, default: null },
    },

    // REGLA DE NEGOCIO CRÍTICA
    meta_minima: {
      type:     Number,
      required: [true, 'La meta mínima es obligatoria'],
      min:      [0, 'La meta mínima no puede ser negativa'],
    },

    cantidad_ejecutada: {
      type:    Number,
      default: 0,
      min:     [0, 'La cantidad ejecutada no puede ser negativa'],
    },

    fecha_inicio_planificada: {
      type:     Date,
      required: [true, 'La fecha de inicio planificada es obligatoria'],
    },
    fecha_fin_planificada: { type: Date },
    fecha_inicio_real:     { type: Date },
    fecha_fin_real:        { type: Date },

    estado: {
      type:    String,
      enum:    Object.values(ESTADOS_PAL),
      default: ESTADOS_PAL.PENDIENTE,
    },

    prioridad: {
      type:    Number,
      min:     1,
      max:     5,
      default: 3,
    },

    observaciones: { type: String, trim: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ── ÍNDICES ───────────────────────────────────────────────────
proyectoActividadLoteSchema.index({ proyecto: 1 });
proyectoActividadLoteSchema.index({ 'lote.codigo': 1 });
proyectoActividadLoteSchema.index({ 'actividad.nombre': 1 });
proyectoActividadLoteSchema.index({ estado: 1 });
proyectoActividadLoteSchema.index({ proyecto: 1, estado: 1 });

// ── TRIGGER: meta_minima solo puede aumentar ──────────────────
proyectoActividadLoteSchema.pre('save', function () {
  if (this.isModified('meta_minima') && !this.isNew) {
    const original = this._original || {};
    if (original.meta_minima && this.meta_minima < original.meta_minima) {
      throw new Error('La meta mínima solo puede aumentar, nunca disminuir');
    }
  }
});

proyectoActividadLoteSchema.post('init', function (doc) {
  doc._original = doc.toObject();
});

// ── VALIDACIÓN: No CUMPLIDA sin alcanzar meta ─────────────────
proyectoActividadLoteSchema.pre('save', function () {
  if (this.isModified('estado') && this.estado === ESTADOS_PAL.CUMPLIDA) {
    if (!this.meta_minima || this.meta_minima <= 0) {
      throw new Error('No se puede marcar como CUMPLIDA sin tener una meta mínima definida');
    }
    if (this.cantidad_ejecutada < this.meta_minima) {
      throw new Error('No se puede marcar como CUMPLIDA sin haber alcanzado la meta mínima');
    }
  }
});

// ── VIRTUALS ──────────────────────────────────────────────────
proyectoActividadLoteSchema.virtual('porcentajeAvance').get(function () {
  if (!this.meta_minima || this.meta_minima === 0) return 0;
  return Math.round((this.cantidad_ejecutada / this.meta_minima) * 100);
});

proyectoActividadLoteSchema.virtual('cumplioMeta').get(function () {
  return this.cantidad_ejecutada >= this.meta_minima;
});

proyectoActividadLoteSchema.set('toJSON',   { virtuals: true });
proyectoActividadLoteSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ProyectoActividadLote', proyectoActividadLoteSchema);