const mongoose = require('mongoose');

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
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: [true, 'El supervisor es obligatorio']
  },
  nucleo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Nucleo',
    default: null
  },
  miembros: [{
    persona: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Persona'
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

// Índices
cuadrillaSchema.index({ codigo: 1 });
cuadrillaSchema.index({ supervisor: 1 });
cuadrillaSchema.index({ nucleo: 1 });

// Virtual para contar miembros activos
cuadrillaSchema.virtual('cantidadMiembros').get(function() {
  return this.miembros.filter(m => m.activo).length;
});

// Método para agregar miembro
cuadrillaSchema.methods.agregarMiembro = function(personaId) {
  // Verificar que no esté ya en la cuadrilla
  const yaExiste = this.miembros.some(
    m => m.persona.toString() === personaId.toString() && m.activo
  );
  
  if (yaExiste) {
    throw new Error('La persona ya pertenece a esta cuadrilla');
  }
  
  this.miembros.push({
    persona: personaId,
    fecha_ingreso: new Date(),
    activo: true
  });
  
  return this.save();
};

// Método para remover miembro
cuadrillaSchema.methods.removerMiembro = function(personaId) {
  const miembro = this.miembros.find(
    m => m.persona.toString() === personaId.toString() && m.activo
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