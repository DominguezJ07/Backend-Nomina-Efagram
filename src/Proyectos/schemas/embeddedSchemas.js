/**
 * embeddedSchemas.js
 * Ruta: src/Proyectos/schemas/embeddedSchemas.js
 *
 * ✅ Objetos JS planos — sin new Schema()
 * ✅ Sin _id
 * ✅ Sin ObjectId
 * ✅ Sin ref
 * ✅ Nombres limpios — sin sufijo "Ref"
 */

const PersonaSchema = {
  nombre:    String,
  documento: String,
};

const ZonaSchema = {
  nombre: String,
  codigo: String,
};

const NucleoSchema = {
  nombre: String,
};

const FincaSchema = {
  nombre: String,
  codigo: String,
};

const LoteSchema = {
  nombre: String,
  codigo: String,
};

const ActividadSchema = {
  actividad: {
    nombre: String,
  },
  asignacion_subproyecto: {
    nombre: String,
  },
  cantidad:        Number,
  precio_unitario: Number,
};

const CuadrillaSchema = {
  nombre: String,
  codigo: String,
};

// ✅ Renombrado: ContratoRefSchema → ContratoSchema
const ContratoSchema = {
  codigo: String,
  nombre: String,
};

// ✅ Renombrado: ClienteRefSchema → ClienteSchema
const ClienteSchema = {
  nombre: String,
  nit:    String,
};

module.exports = {
  PersonaSchema,
  ZonaSchema,
  NucleoSchema,
  FincaSchema,
  LoteSchema,
  ActividadSchema,
  CuadrillaSchema,
  ContratoSchema,
  ClienteSchema,
};