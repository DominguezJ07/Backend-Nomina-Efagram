/**
 * ============================================================
 * embeddedSchemas.js
 * Ruta: src/Proyectos/schemas/embeddedSchemas.js
 * ============================================================
 *
 * FUENTE ÚNICA DE VERDAD para todos los subdocumentos embebidos.
 *
 * REGLA ARQUITECTÓNICA:
 *   - Datos de API EXTERNA   → objeto embebido (sin ObjectId, sin ref)
 *   - Datos de modelo INTERNO → ObjectId + ref (solo cuando el modelo vive en este mismo backend)
 *
 * USO:
 *   const { PersonaSchema, ZonaSchema } = require('../schemas/embeddedSchemas');
 * ============================================================
 */

const mongoose = require('mongoose');

// ──────────────────────────────────────────────────────────────
// PERSONA
// Fuente: API externa de nómina / personal
// Campos: documento de identidad y nombre completo son obligatorios
// ──────────────────────────────────────────────────────────────
const PersonaSchema = new mongoose.Schema(
  {
    documento: {
      type:     String,
      required: [true, 'El documento de la persona es obligatorio'],
      trim:     true,
    },
    nombre: {
      type:     String,
      required: [true, 'El nombre de la persona es obligatorio'],
      trim:     true,
    },
    cargo: {
      type:    String,
      trim:    true,
      default: null,
    },
    // Campos opcionales según contexto de uso
    proceso: {
      type:    String,
      trim:    true,
      default: null,
    },
  },
  { _id: false }
);

// ──────────────────────────────────────────────────────────────
// ZONA
// Fuente: API externa de geografía / estructura organizacional
// ──────────────────────────────────────────────────────────────
const ZonaSchema = new mongoose.Schema(
  {
    codigo: {
      type:     String,
      required: [true, 'El código de la zona es obligatorio'],
      trim:     true,
    },
    nombre: {
      type:     String,
      required: [true, 'El nombre de la zona es obligatorio'],
      trim:     true,
    },
  },
  { _id: false }
);

// ──────────────────────────────────────────────────────────────
// NUCLEO
// Fuente: API externa de estructura operativa
// ──────────────────────────────────────────────────────────────
const NucleoSchema = new mongoose.Schema(
  {
    codigo: {
      type:    String,
      trim:    true,
      default: '',
    },
    nombre: {
      type:     String,
      required: [true, 'El nombre del núcleo es obligatorio'],
      trim:     true,
    },
  },
  { _id: false }
);

// ──────────────────────────────────────────────────────────────
// FINCA
// Fuente: API externa de activos / propiedades
// ──────────────────────────────────────────────────────────────
const FincaSchema = new mongoose.Schema(
  {
    codigo: {
      type:     String,
      required: [true, 'El código de la finca es obligatorio'],
      trim:     true,
    },
    nombre: {
      type:     String,
      required: [true, 'El nombre de la finca es obligatorio'],
      trim:     true,
    },
  },
  { _id: false }
);

// ──────────────────────────────────────────────────────────────
// LOTE
// Fuente: API externa de activos / subdivisiones de finca
// ──────────────────────────────────────────────────────────────
const LoteSchema = new mongoose.Schema(
  {
    codigo: {
      type:    String,
      trim:    true,
      default: '',
    },
    nombre: {
      type:     String,
      required: [true, 'El nombre del lote es obligatorio'],
      trim:     true,
    },
    area_hectareas: {
      type:    Number,
      default: null,
      min:     0,
    },
  },
  { _id: false }
);

// ──────────────────────────────────────────────────────────────
// ACTIVIDAD
// Fuente: API externa de catálogo de actividades
// ──────────────────────────────────────────────────────────────
const ActividadSchema = new mongoose.Schema(
  {
    codigo: {
      type:    String,
      trim:    true,
      default: '',
    },
    nombre: {
      type:     String,
      required: [true, 'El nombre de la actividad es obligatorio'],
      trim:     true,
    },
    unidad: {
      type:    String,
      trim:    true,
      default: 'hectareas',
    },
  },
  { _id: false }
);

// ──────────────────────────────────────────────────────────────
// CONTRATO
// Fuente: API externa o modelo interno simplificado
// Solo se embebe una referencia liviana, no el contrato completo
// ──────────────────────────────────────────────────────────────
const ContratoRefSchema = new mongoose.Schema(
  {
    codigo: {
      type:     String,
      required: [true, 'El código del contrato es obligatorio'],
      trim:     true,
    },
    nombre: {
      type:    String,
      trim:    true,
      default: '',
    },
  },
  { _id: false }
);

// ──────────────────────────────────────────────────────────────
// CUADRILLA
// Fuente: API externa de gestión de cuadrillas
// ──────────────────────────────────────────────────────────────
const CuadrillaSchema = new mongoose.Schema(
  {
    codigo: {
      type:    String,
      trim:    true,
      default: '',
    },
    nombre: {
      type:     String,
      required: [true, 'El nombre de la cuadrilla es obligatorio'],
      trim:     true,
    },
  },
  { _id: false }
);

// ──────────────────────────────────────────────────────────────
// CLIENTE EMBEBIDO
// Fuente: modelo interno (Cliente) — se embebe solo la referencia liviana
// ──────────────────────────────────────────────────────────────
const ClienteRefSchema = new mongoose.Schema(
  {
    nombre: {
      type:     String,
      required: [true, 'El nombre del cliente es obligatorio'],
      trim:     true,
    },
    nit: {
      type:    String,
      trim:    true,
      default: '',
    },
  },
  { _id: false }
);

module.exports = {
  PersonaSchema,
  ZonaSchema,
  NucleoSchema,
  FincaSchema,
  LoteSchema,
  ActividadSchema,
  ContratoRefSchema,
  CuadrillaSchema,
  ClienteRefSchema,
};