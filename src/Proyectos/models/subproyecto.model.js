/**
 * subproyecto.model.js
 * Ruta: src/Proyectos/models/subproyecto.model.js
 */

const mongoose = require('mongoose');
const {
  PersonaSchema,
  NucleoSchema,
  CuadrillaSchema,
  ClienteRefSchema,
} = require('../schemas/embeddedSchemas');

const subproyectoSchema = new mongoose.Schema(
  {
    codigo: {
      type:      String,
      required:  [true, 'El código es obligatorio'],
      unique:    true,
      uppercase: true,
      trim:      true,
    },
    nombre: {
      type:     String,
      required: [true, 'El nombre es obligatorio'],
      trim:     true,
    },

    // ✅ Referencia interna liviana al proyecto padre
    // Se guarda como objeto embebido para evitar lookups,
    // pero proyecto._id se guarda para poder hacer queries internas
    proyecto: {
      _id:    { type: mongoose.Schema.Types.ObjectId, required: true },
      codigo: { type: String, required: true, trim: true },
      nombre: { type: String, trim: true, default: '' },
    },

    // ✅ Núcleos — estandarizados con NucleoSchema
    nucleos: {
      type:    [NucleoSchema],
      default: [],
    },

    // ✅ Cuadrillas — estandarizadas con CuadrillaSchema
    cuadrillas: {
      type:    [CuadrillaSchema],
      default: [],
    },

    // ✅ Supervisor — PersonaSchema estandarizado
    supervisor: {
      type:    PersonaSchema,
      default: null,
    },

    // ✅ Cliente — referencia liviana estandarizada
    cliente: {
      type:    ClienteRefSchema,
      default: null,
    },

    fecha_inicio:       { type: Date },
    fecha_fin_estimada: { type: Date },

    estado: {
      type:    String,
      enum:    ['ACTIVO', 'CERRADO', 'CANCELADO'],
      default: 'ACTIVO',
    },

    observaciones: { type: String, trim: true },
  },
  { timestamps: true, versionKey: false }
);

// ── ÍNDICES ───────────────────────────────────────────────────────────
subproyectoSchema.index({ 'proyecto._id': 1 });
subproyectoSchema.index({ 'proyecto.codigo': 1 });
subproyectoSchema.index({ 'proyecto._id': 1, estado: 1 });

subproyectoSchema.set('toJSON',   { virtuals: true });
subproyectoSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Subproyecto', subproyectoSchema);