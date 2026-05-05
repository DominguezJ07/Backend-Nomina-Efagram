/**
 * subproyecto.model.js
 * Ruta: src/Proyectos/models/subproyecto.model.js
 *
 * ✅ Sin ObjectId en subdocumentos
 * ✅ Sin ref
 * ✅ Sin populate
 * ✅ Objetos embebidos planos
 */

const mongoose = require('mongoose');

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

    // ✅ Proyecto como objeto plano embebido — sin ObjectId, sin ref
    proyecto: {
      codigo: { type: String, required: true, trim: true },
      nombre: { type: String, trim: true, default: '' },
    },

    // ✅ Núcleos — array de objetos planos
    nucleos: [
      {
        _id:    false,
        nombre: { type: String, trim: true, default: null },
      },
    ],

    // ✅ Cuadrillas — array de objetos planos
    cuadrillas: [
      {
        _id:    false,
        nombre: { type: String, trim: true, default: null },
        codigo: { type: String, trim: true, default: null },
      },
    ],

    // ✅ Personal — array de objetos planos
    personal: [
      {
        _id:       false,
        nombre:    { type: String, trim: true, default: null },
        documento: { type: String, trim: true, default: null },
      },
    ],

    // ✅ Fincas — array de objetos planos
    fincas: [
      {
        _id:    false,
        nombre: { type: String, trim: true, default: null },
        codigo: { type: String, trim: true, default: null },
      },
    ],

    // ✅ Actividades — array de objetos planos
    actividades: [
      {
        _id: false,
        actividad: {
          nombre: { type: String, trim: true, default: null },
        },
        asignacion_subproyecto: {
          nombre: { type: String, trim: true, default: null },
        },
        cantidad:        { type: Number, default: 0 },
        precio_unitario: { type: Number, default: 0 },
      },
    ],

    // ✅ Supervisor — objeto plano embebido
    supervisor: {
      nombre:    { type: String, trim: true, default: null },
      documento: { type: String, trim: true, default: null },
    },

    // ✅ Cliente — objeto plano embebido
    cliente: {
      nombre: { type: String, trim: true, default: null },
      nit:    { type: String, trim: true, default: null },
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

// ── ÍNDICES ───────────────────────────────────────────────────
subproyectoSchema.index({ 'proyecto.codigo': 1 });
subproyectoSchema.index({ 'proyecto.codigo': 1, estado: 1 });

subproyectoSchema.set('toJSON',   { virtuals: true });
subproyectoSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Subproyecto', subproyectoSchema);