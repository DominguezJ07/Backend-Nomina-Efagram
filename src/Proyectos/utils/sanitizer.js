/**
 * ============================================================
 * sanitizer.js
 * Ruta: src/Proyectos/utils/sanitizer.js
 * ============================================================
 *
 * Funciones puras de sanitización y validación para objetos
 * embebidos. Garantizan que SOLO los campos permitidos lleguen
 * a MongoDB, sin importar lo que envíe el cliente.
 *
 * PATRÓN:
 *   sanitize*(input)  → devuelve objeto limpio o lanza ApiError
 * ============================================================
 */

// Usamos ApiError si está disponible; si no, lanzamos Error estándar
let ApiError;
try {
  ApiError = require('../middlewares/errorHandler').ApiError;
} catch {
  ApiError = class ApiError extends Error {
    constructor(status, message) {
      super(message);
      this.statusCode = status;
    }
  };
}

// ── Helper interno ──────────────────────────────────────────
const required = (value, campo) => {
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new ApiError(400, `El campo '${campo}' es obligatorio`);
  }
  return String(value).trim();
};

const optional = (value, fallback = null) => {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  return String(value).trim();
};

const optionalNumber = (value, fallback = null) => {
  const n = parseFloat(value);
  return isNaN(n) ? fallback : n;
};

// ── PERSONA ─────────────────────────────────────────────────
/**
 * Sanitiza un objeto persona de la API externa.
 * Acepta múltiples formatos de entrada (cc/document/documento, name/nombre)
 * y normaliza a la estructura estándar.
 *
 * Entrada admitida:
 *   { cc, name, cargo, proceso }          ← formato API externa
 *   { documento, nombre, cargo, proceso } ← formato alternativo
 *
 * Salida siempre:
 *   { documento, nombre, cargo, proceso }
 */
const sanitizePersona = (input, campo = 'persona') => {
  if (!input || typeof input !== 'object') {
    throw new ApiError(400, `El campo '${campo}' debe ser un objeto`);
  }

  // Normalizar claves: acepta cc o documento; name o nombre
  const docRaw    = input.documento ?? input.cc ?? input.document ?? null;
  const nombreRaw = input.nombre    ?? input.name                 ?? null;

  return {
    documento: required(docRaw,    `${campo}.documento`),
    nombre:    required(nombreRaw, `${campo}.nombre`),
    cargo:     optional(input.cargo),
    proceso:   optional(input.proceso),
    // 🚫 cualquier otro campo del input es ignorado (sanitización)
  };
};

// ── ZONA ────────────────────────────────────────────────────
/**
 * Acepta: { id, nombre } o { codigo, nombre }
 * Salida: { codigo, nombre }
 */
const sanitizeZona = (input, campo = 'zona') => {
  if (!input || typeof input !== 'object') {
    throw new ApiError(400, `El campo '${campo}' debe ser un objeto`);
  }

  const codigoRaw = input.codigo ?? input.id ?? null;

  return {
    codigo: required(codigoRaw,   `${campo}.codigo`),
    nombre: required(input.nombre, `${campo}.nombre`),
  };
};

// ── NUCLEO ───────────────────────────────────────────────────
/**
 * Acepta: { nombre } o { nombre, codigo }
 * Salida: { codigo, nombre }
 */
const sanitizeNucleo = (input, campo = 'nucleo') => {
  if (!input || typeof input !== 'object') {
    throw new ApiError(400, `El campo '${campo}' debe ser un objeto`);
  }

  return {
    codigo: optional(input.codigo, ''),
    nombre: required(input.nombre, `${campo}.nombre`),
  };
};

// ── FINCA ────────────────────────────────────────────────────
/**
 * Acepta: { nombre, codigo }
 * Salida: { codigo, nombre }
 */
const sanitizeFinca = (input, campo = 'finca') => {
  if (!input || typeof input !== 'object') {
    throw new ApiError(400, `El campo '${campo}' debe ser un objeto`);
  }

  return {
    codigo: required(input.codigo, `${campo}.codigo`),
    nombre: required(input.nombre, `${campo}.nombre`),
  };
};

// ── LOTE ─────────────────────────────────────────────────────
/**
 * Acepta: { nombre, codigo, area_hectareas }
 * Salida: { codigo, nombre, area_hectareas }
 */
const sanitizeLote = (input, campo = 'lote') => {
  if (!input || typeof input !== 'object') {
    throw new ApiError(400, `El campo '${campo}' debe ser un objeto`);
  }

  return {
    codigo:         optional(input.codigo, ''),
    nombre:         required(input.nombre, `${campo}.nombre`),
    area_hectareas: optionalNumber(input.area_hectareas),
  };
};

// ── ACTIVIDAD ────────────────────────────────────────────────
/**
 * Acepta: { nombre, codigo, unidad }
 * Salida: { codigo, nombre, unidad }
 */
const sanitizeActividad = (input, campo = 'actividad') => {
  if (!input || typeof input !== 'object') {
    throw new ApiError(400, `El campo '${campo}' debe ser un objeto`);
  }

  return {
    codigo: optional(input.codigo, ''),
    nombre: required(input.nombre, `${campo}.nombre`),
    unidad: optional(input.unidad, 'hectareas'),
  };
};

// ── CONTRATO REF ─────────────────────────────────────────────
/**
 * Acepta: { codigo, nombre }
 * Salida: { codigo, nombre }
 */
const sanitizeContratoRef = (input, campo = 'contrato') => {
  if (!input || typeof input !== 'object') {
    throw new ApiError(400, `El campo '${campo}' debe ser un objeto`);
  }

  return {
    codigo: required(input.codigo, `${campo}.codigo`).toUpperCase(),
    nombre: optional(input.nombre, ''),
  };
};

// ── CUADRILLA ────────────────────────────────────────────────
const sanitizeCuadrilla = (input, campo = 'cuadrilla') => {
  if (!input || typeof input !== 'object') {
    throw new ApiError(400, `El campo '${campo}' debe ser un objeto`);
  }

  return {
    codigo: optional(input.codigo, ''),
    nombre: required(input.nombre, `${campo}.nombre`),
  };
};

// ── CLIENTE REF ──────────────────────────────────────────────
const sanitizeClienteRef = (input, campo = 'cliente') => {
  if (!input || typeof input !== 'object') {
    throw new ApiError(400, `El campo '${campo}' debe ser un objeto`);
  }

  return {
    nombre: required(input.nombre, `${campo}.nombre`),
    nit:    optional(input.nit, ''),
  };
};

// ── Arrays ───────────────────────────────────────────────────
/**
 * Sanitiza un array usando una función sanitizadora.
 * Filtra elementos null/undefined antes de procesar.
 * @param {Array} arr - Array de entrada
 * @param {Function} sanitizeFn - Función sanitizadora por elemento
 * @param {string} campo - Nombre del campo (para mensajes de error)
 */
const sanitizeArray = (arr, sanitizeFn, campo = 'items') => {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(item => item !== null && item !== undefined)
    .map((item, i) => sanitizeFn(item, `${campo}[${i}]`));
};

module.exports = {
  sanitizePersona,
  sanitizeZona,
  sanitizeNucleo,
  sanitizeFinca,
  sanitizeLote,
  sanitizeActividad,
  sanitizeContratoRef,
  sanitizeCuadrilla,
  sanitizeClienteRef,
  sanitizeArray,
  // helpers internos exportados para uso en controllers
  _required:       required,
  _optional:       optional,
  _optionalNumber: optionalNumber,
};