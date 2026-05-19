/**
 * sanitizer.js
 * Ruta: src/Proyectos/utils/sanitizer.js
 *
 * Funciones puras para limpiar y transformar datos del frontend
 * antes de guardarlos en MongoDB.
 *
 * ✅ Sin ObjectId
 * ✅ Sin ref
 * ✅ Solo datos planos
 */

// ── Helper: lanzar error 400 ──────────────────────────────────
const fail = (campo) => {
  const err = new Error(`El campo '${campo}' es obligatorio`);
  err.statusCode = 400;
  throw err;
};

const str = (val, fallback = null) =>
  val !== undefined && val !== null && String(val).trim() !== ''
    ? String(val).trim()
    : fallback;

const num = (val, fallback = 0) => {
  const n = parseFloat(val);
  return isNaN(n) ? fallback : n;
};

// ── PERSONA ──────────────────────────────────────────────────
// Acepta: { nombre, documento } o { name, cc }
const sanitizePersona = (input, campo = 'persona') => {
  if (!input || typeof input !== 'object') return null;
  return {
    nombre:    str(input.nombre    ?? input.name,     null),
    documento: str(input.documento ?? input.cc,       null),
  };
};

// ── ZONA ─────────────────────────────────────────────────────
const sanitizeZona = (input, campo = 'zona') => {
  if (!input || typeof input !== 'object') return null;
  return {
    nombre: str(input.nombre, null),
    codigo: str(input.codigo ?? input.id, null),
  };
};

// ── NUCLEO ───────────────────────────────────────────────────
const sanitizeNucleo = (input) => {
  if (!input || typeof input !== 'object') return null;
  return {
    id:     str(input.id || input._id || input.codigo || input.code || '', null),
    codigo: str(input.codigo || input.code || input.id || '', null),
    nombre: str(input.nombre || input.name || '', null),
  };
};

// ── FINCA ────────────────────────────────────────────────────
const sanitizeFinca = (input, campo = 'finca') => {
  if (!input || typeof input !== 'object') fail(campo);
  if (!str(input.nombre)) fail(`${campo}.nombre`);
  if (!str(input.codigo)) fail(`${campo}.codigo`);
  return {
    nombre: str(input.nombre),
    codigo: str(input.codigo),
  };
};

// ── LOTE ─────────────────────────────────────────────────────
const sanitizeLote = (input, campo = 'lote') => {
  if (!input) fail(campo);
  
  // ✅ Aceptar string o objeto
  if (typeof input === 'string') {
    const trimmed = str(input);
    if (!trimmed) fail(`${campo}`);
    return {
      nombre: trimmed,
      codigo: trimmed,
    };
  }
  
  if (typeof input !== 'object') fail(campo);
  if (!str(input.nombre)) fail(`${campo}.nombre`);
  return {
    nombre: str(input.nombre),
    codigo: str(input.codigo, ''),
  };
};

// ── ACTIVIDAD ────────────────────────────────────────────────
const sanitizeActividad = (input) => {
  if (!input || typeof input !== 'object') return null;
  return {
    actividad: {
      nombre: str(input.actividad?.nombre, null),
    },
    asignacion_subproyecto: {
      nombre: str(input.asignacion_subproyecto?.nombre, null),
    },
    cantidad:        num(input.cantidad,        0),
    precio_unitario: num(input.precio_unitario, 0),
  };
};

// ── CUADRILLA ────────────────────────────────────────────────
const sanitizeCuadrilla = (input) => {
  if (!input || typeof input !== 'object') return null;
  return {
    nombre: str(input.nombre, null),
    codigo: str(input.codigo, null),
  };
};

// ── CONTRATO REF ─────────────────────────────────────────────
const sanitizeContratoRef = (input, campo = 'contrato') => {
  if (!input || typeof input !== 'object') fail(campo);
  if (!str(input.codigo)) fail(`${campo}.codigo`);
  return {
    codigo: str(input.codigo).toUpperCase(),
    nombre: str(input.nombre, ''),
  };
};

// ── CLIENTE REF ──────────────────────────────────────────────
const sanitizeClienteRef = (input, campo = 'cliente') => {
  if (!input || typeof input !== 'object') fail(campo);
  if (!str(input.nombre)) fail(`${campo}.nombre`);
  return {
    nombre: str(input.nombre),
    nit:    str(input.nit, ''),
  };
};

// ── ARRAYS ───────────────────────────────────────────────────
const sanitizeFincas      = (arr) => (arr || []).filter(Boolean).map(sanitizeFinca);
const sanitizeLotes       = (arr) => (arr || []).filter(Boolean).map(sanitizeLote);
const sanitizePersonas    = (arr) => (arr || []).filter(Boolean).map(sanitizePersona).filter(Boolean);
const sanitizeNucleos     = (arr) => (arr || []).filter(Boolean).map(sanitizeNucleo).filter(Boolean);
const sanitizeCuadrillas  = (arr) => (arr || []).filter(Boolean).map(sanitizeCuadrilla).filter(Boolean);
const sanitizeActividades = (arr) => (arr || []).filter(Boolean).map(sanitizeActividad).filter(Boolean);

module.exports = {
  sanitizePersona,
  sanitizeZona,
  sanitizeNucleo,
  sanitizeFinca,
  sanitizeLote,
  sanitizeActividad,
  sanitizeCuadrilla,
  sanitizeContratoRef,
  sanitizeClienteRef,
  // arrays
  sanitizeFincas,
  sanitizeLotes,
  sanitizePersonas,
  sanitizeNucleos,
  sanitizeCuadrillas,
  sanitizeActividades,
  // helpers
  _str: str,
  _num: num,
};