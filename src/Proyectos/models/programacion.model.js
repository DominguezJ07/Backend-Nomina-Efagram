/**
 * programacion.model.js
 * Ruta: src/Proyectos/models/programacion.model.js
 *
 * ✅ Sin ObjectId en subdocumentos
 * ✅ Sin ref
 * ✅ Sin populate
 * ✅ Objetos embebidos planos
 */

const mongoose = require('mongoose');
const {
  PersonaSchema,
  FincaSchema,
  LoteSchema,
  ContratoRefSchema,
} = require('../schemas/embeddedSchemas');

const programacionSchema = new mongoose.Schema(
  {
    // ✅ Contrato como objeto plano embebido
    contrato: {
      type:     ContratoRefSchema,
      required: [true, 'El contrato es obligatorio'],
    },

    fecha_inicial: {
      type:     Date,
      required: [true, 'La fecha inicial es obligatoria'],
    },

    fecha_final: { type: Date },

    semana: {
      type:    Number,
      default: 1,
    },

    estado: {
      type:    String,
      enum:    ['ACTIVA', 'COMPLETADA', 'CANCELADA', 'PAUSADA'],
      default: 'ACTIVA',
    },

    cantidad_proyectada: {
      type:    Number,
      default: 1,
      min:     [0, 'La cantidad proyectada debe ser mayor o igual a 0'],
    },

    valor_proyectado: {
      type:    Number,
      default: 0,
      min:     [0, 'El valor proyectado debe ser mayor o igual a 0'],
    },

    // ✅ Actividad como objeto plano embebido
    actividad: {
      nombre: { type: String, trim: true, default: null },
      codigo: { type: String, trim: true, default: '' },
      unidad: { type: String, trim: true, default: 'hectareas' },
    },

    // ✅ Finca como objeto plano embebido
    finca: {
      type:     FincaSchema,
      required: [true, 'La finca es obligatoria'],
    },

    // ✅ Lote como objeto plano embebido
    lote: {
      type:     LoteSchema,
      required: [true, 'El lote es obligatorio'],
    },

    cantidad_ejecutada_total: {
      type:    Number,
      default: 0,
      min:     0,
    },

    porcentaje_cumplimiento: {
      type:    Number,
      default: 0,
      min:     0,
      max:     200,
    },

    // ✅ Persona que creó — objeto plano embebido
    creado_por: {
      type:    PersonaSchema,
      default: null,
    },

    // ✅ Persona que actualizó — objeto plano embebido
    actualizado_por: {
      type:    PersonaSchema,
      default: null,
    },

    observaciones: {
      type:    String,
      trim:    true,
      default: '',
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── ÍNDICES ───────────────────────────────────────────────────
programacionSchema.index({ 'contrato.codigo': 1 });
programacionSchema.index({ fecha_inicial: 1 });
programacionSchema.index({ estado: 1 });
programacionSchema.index({ 'finca.codigo': 1 });
programacionSchema.index({ 'contrato.codigo': 1, fecha_inicial: 1 });

// ── VIRTUAL: Días restantes ───────────────────────────────────
programacionSchema.virtual('dias_restantes').get(function () {
  const hoy  = new Date();
  const fin  = new Date(this.fecha_final);
  const diff = fin.getTime() - hoy.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
});

// ── VIRTUAL: Estado semana ────────────────────────────────────
programacionSchema.virtual('estado_semana').get(function () {
  if (this.estado === 'COMPLETADA') return 'COMPLETADA';
  if (this.estado === 'CANCELADA')  return 'CANCELADA';
  if (this.dias_restantes <= 0)     return 'EXPIRADA';
  if (this.dias_restantes <= 2)     return 'POR VENCER';
  return 'EN PROGRESO';
});

// ── PRE-SAVE: Calcular fecha_final y semana ───────────────────
programacionSchema.pre('save', async function () {
  if (this.fecha_inicial && !this.fecha_final) {
    const fechaFinal = new Date(this.fecha_inicial);
    fechaFinal.setDate(fechaFinal.getDate() + 6);
    this.fecha_final = fechaFinal;
  }
  if (this.fecha_inicial) {
    const hoy   = new Date();
    const diff  = hoy.getTime() - new Date(this.fecha_inicial).getTime();
    const dias  = Math.floor(diff / (1000 * 3600 * 24));
    this.semana = Math.max(1, Math.floor(dias / 7) + 1);
  }
});

// ── PRE-SAVE: Validar duplicado ───────────────────────────────
programacionSchema.pre('save', async function () {
  if (this.isNew) {
    const existente = await mongoose.model('Programacion').findOne({
      'contrato.codigo': this.contrato.codigo,
      fecha_inicial:     this.fecha_inicial,
      _id:               { $ne: this._id },
    });
    if (existente) {
      throw new Error('Ya existe una programación para este contrato en esta fecha');
    }
  }
});

// ── MÉTODOS ───────────────────────────────────────────────────
programacionSchema.methods.actualizarPorcentaje = function () {
  if (this.cantidad_proyectada > 0) {
    this.porcentaje_cumplimiento = Math.round(
      (this.cantidad_ejecutada_total / this.cantidad_proyectada) * 100
    );
  }
  return this.save();
};

programacionSchema.methods.obtenerRegistrosDiarios = function () {
  return mongoose
    .model('RegistroDiarioProgramacion')
    .find({ programacion: this._id })
    .sort({ fecha: 1 });
};

module.exports = mongoose.model('Programacion', programacionSchema);