/**
 * subproyecto.model.js
 * Ruta: src/Proyectos/models/subproyecto.model.js
 *
 * ✅ Sin ObjectId
 * ✅ Sin ref
 * ✅ Sin _id en subdocumentos
 * ✅ 100% objetos embebidos planos
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

    // ✅ Proyecto — referencia ObjectId + snapshot
    proyecto_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Proyecto',
      required: [true, 'El proyecto es obligatorio'],
      index: true,
    },

    proyecto: {
      codigo: { type: String, trim: true, default: null },
      nombre: { type: String, trim: true, default: null },
    },

    // ✅ Núcleos — referencias ObjectId + snapshots
    nucleo_ids: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Nucleo',
      },
    ],

    nucleos: [
      {
        _id: false,
        id: { type: String, trim: true, default: null },
        codigo: { type: String, trim: true, default: null },
        nombre: { type: String, trim: true, default: null },
      },
    ],

    // ✅ Cuadrillas — array de objetos planos sin _id
    cuadrillas: [
      {
        nombre: { type: String, trim: true, default: null },
        codigo: { type: String, trim: true, default: null },
      },
    ],

    // ✅ Personal — array de objetos planos sin _id
    personal: [
      {
        nombre:    { type: String, trim: true, default: null },
        documento: { type: String, trim: true, default: null },
      },
    ],

    // ✅ Fincas — array de objetos planos sin _id
    fincas: [
      {
        nombre: { type: String, trim: true, default: null },
        codigo: { type: String, trim: true, default: null },
      },
    ],

    // ✅ Zonas — array de objetos planos sin _id
    zonas: [
      {
        nombre: { type: String, trim: true, default: null },
      },
    ],

    // ✅ Actividades — array de objetos planos sin _id
    actividades: [
      {
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
subproyectoSchema.index({ proyecto_id: 1 });
subproyectoSchema.index({ proyecto_id: 1, estado: 1 });
subproyectoSchema.index({ 'proyecto.codigo': 1 });
subproyectoSchema.index({ 'proyecto.codigo': 1, estado: 1 });

subproyectoSchema.set('toJSON',   { virtuals: true });
subproyectoSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Subproyecto', subproyectoSchema);