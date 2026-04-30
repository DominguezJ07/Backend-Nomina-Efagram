const mongoose = require('mongoose');

// ─────────────────────────────────────────────
// Subdocumento: persona embebida (viene de API externa)
// ─────────────────────────────────────────────
const personaEmbebidaSchema = new mongoose.Schema(
  {
    _id: false,
    cc: {
      type: String,
      required: [true, 'La cédula de la persona es obligatoria'],
      trim: true
    },
    name: {
      type: String,
      required: [true, 'El nombre de la persona es obligatorio'],
      trim: true
    },
    cargo: {
      type: String,
      trim: true,
      default: null
    },
    nombrefinca: {
      type: String,
      trim: true,
      default: null
    },
    proceso: {
      type: String,
      trim: true,
      default: null
    }
  }
);

// ─────────────────────────────────────────────
// Subdocumento: supervisor embebido (viene de API externa)
// ─────────────────────────────────────────────
const supervisorEmbebidoSchema = new mongoose.Schema(
  {
    _id: false,
    cc: {
      type: String,
      required: [true, 'La cédula del supervisor es obligatoria'],
      trim: true
    },
    name: {
      type: String,
      required: [true, 'El nombre del supervisor es obligatorio'],
      trim: true
    },
    cargo: {
      type: String,
      trim: true,
      default: null
    },
    nombrefinca: {
      type: String,
      trim: true,
      default: null
    },
    proceso: {
      type: String,
      trim: true,
      default: null
    }
  }
);

// ─────────────────────────────────────────────
// Subdocumento: nucleo embebido (viene de API externa)
// ─────────────────────────────────────────────
const nucleoEmbebidoSchema = new mongoose.Schema(
  {
    _id: false,
    id: {
      type: String,
      required: [true, 'El id del núcleo es obligatorio'],
      trim: true
    },
    nombre: {
      type: String,
      required: [true, 'El nombre del núcleo es obligatorio'],
      trim: true
    }
  }
);

// ─────────────────────────────────────────────
// Schema principal de Cuadrilla
// ─────────────────────────────────────────────
const cuadrillaSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: [true, 'El código es obligatorio'],
    unique: true,
    uppercase: true,
    trim: true
  },
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true
  },

  // ✅ CAMBIADO: era ObjectId ref:'Persona' → ahora objeto embebido desde API externa
  supervisor: {
    type: supervisorEmbebidoSchema,
    required: [true, 'El supervisor es obligatorio']
  },

  // ✅ CAMBIADO: era ObjectId ref:'Nucleo' → ahora objeto embebido desde API externa
  nucleo: {
    type: nucleoEmbebidoSchema,
    default: null
  },

  miembros: [{
    // ✅ CAMBIADO: era ObjectId ref:'Persona' → ahora objeto embebido desde API externa
    persona: {
      type: personaEmbebidaSchema,
      required: [true, 'Los datos de la persona son obligatorios']
    },
    fecha_ingreso: {
      type: Date,
      default: Date.now
    },
    fecha_salida: {
      type: Date,
      default: null
    },
    activo: {
      type: Boolean,
      default: true
    }
  }],

  activa: {
    type: Boolean,
    default: true
  },
  observaciones: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Auto-generar código si no viene en el payload
cuadrillaSchema.pre('validate', function () {
  if (!this.codigo) {
    const ts = Date.now().toString(36).toUpperCase();
    this.codigo = `CUA-${ts}`;
  }
});

// ✅ CAMBIADO: índices ahora apuntan a campos dentro del objeto embebido
cuadrillaSchema.index({ 'supervisor.cc': 1 });
cuadrillaSchema.index({ 'nucleo.id': 1 });
cuadrillaSchema.index({ activa: 1 });

// Virtual para contar miembros activos (sin cambios)
cuadrillaSchema.virtual('cantidadMiembros').get(function() {
  return this.miembros.filter(m => m.activo).length;
});

// ✅ CAMBIADO: recibe objeto persona en lugar de personaId (ObjectId)
cuadrillaSchema.methods.agregarMiembro = function(personaObj) {
  // Verificar duplicado por CC en lugar de ObjectId
  const yaExiste = this.miembros.some(
    m => m.persona.cc === personaObj.cc && m.activo
  );

  if (yaExiste) {
    throw new Error('La persona ya pertenece a esta cuadrilla');
  }

  this.miembros.push({
    persona: personaObj,
    fecha_ingreso: new Date(),
    activo: true
  });

  return this.save();
};

// ✅ CAMBIADO: recibe cc (string) en lugar de personaId (ObjectId)
cuadrillaSchema.methods.removerMiembro = function(cc) {
  const miembro = this.miembros.find(
    m => m.persona.cc === cc && m.activo
  );

  if (!miembro) {
    throw new Error('La persona no pertenece a esta cuadrilla');
  }

  miembro.activo = false;
  miembro.fecha_salida = new Date();

  return this.save();
};

cuadrillaSchema.set('toJSON', { virtuals: true });
cuadrillaSchema.set('toObject', { virtuals: true });

const Cuadrilla = mongoose.model('Cuadrilla', cuadrillaSchema);

module.exports = Cuadrilla;