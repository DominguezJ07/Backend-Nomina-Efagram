/**
 * embeddedSchemas.js
 * Ruta: src/Proyectos/schemas/embeddedSchemas.js
 *
 * Estructuras planas reutilizables para objetos embebidos.
 * ✅ Sin _id
 * ✅ Sin ObjectId
 * ✅ Sin ref
 * ✅ Solo datos planos
 */

// ── PERSONA ──────────────────────────────────────────────────
const PersonaSchema = {
  nombre:    { type: String, trim: true, default: null },
  documento: { type: String, trim: true, default: null },
};

// ── ZONA ─────────────────────────────────────────────────────
const ZonaSchema = {
  nombre: { type: String, trim: true, default: null },
  codigo: { type: String, trim: true, default: null },
};

// ── NUCLEO ───────────────────────────────────────────────────
const NucleoSchema = {
  nombre: { type: String, trim: true, default: null },
};

// ── FINCA ────────────────────────────────────────────────────
const FincaSchema = {
  nombre: { type: String, required: true, trim: true },
  codigo: { type: String, required: true, trim: true },
};

// ── LOTE ─────────────────────────────────────────────────────
const LoteSchema = {
  nombre: { type: String, required: true, trim: true },
  codigo: { type: String, trim: true, default: '' },
};

// ── ACTIVIDAD ────────────────────────────────────────────────
const ActividadSchema = {
  actividad: {
    nombre: { type: String, trim: true, default: null },
  },
  asignacion_subproyecto: {
    nombre: { type: String, trim: true, default: null },
  },
  cantidad:        { type: Number, default: 0 },
  precio_unitario: { type: Number, default: 0 },
};

// ── CUADRILLA ────────────────────────────────────────────────
const CuadrillaSchema = {
  nombre: { type: String, trim: true, default: null },
  codigo: { type: String, trim: true, default: null },
};

// ── CONTRATO REF ─────────────────────────────────────────────
const ContratoRefSchema = {
  codigo: { type: String, required: true, trim: true },
  nombre: { type: String, trim: true, default: '' },
};

// ── CLIENTE REF ──────────────────────────────────────────────
const ClienteRefSchema = {
  nombre: { type: String, required: true, trim: true },
  nit:    { type: String, trim: true, default: '' },
};

module.exports = {
  PersonaSchema,
  ZonaSchema,
  NucleoSchema,
  FincaSchema,
  LoteSchema,
  ActividadSchema,
  CuadrillaSchema,
  ContratoRefSchema,
  ClienteRefSchema,
};