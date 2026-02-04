const mongoose = require('mongoose');

const personaRolSchema = new mongoose.Schema({
  persona: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: [true, 'La persona es obligatoria']
  },
  rol: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rol',
    required: [true, 'El rol es obligatorio']
  },
  fecha_asignacion: {
    type: Date,
    default: Date.now
  },
  fecha_fin: {
    type: Date,
    default: null
  },
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Índice compuesto único: una persona no puede tener el mismo rol activo dos veces
personaRolSchema.index({ persona: 1, rol: 1, activo: 1 });

// Método estático para obtener roles de una persona
personaRolSchema.statics.getRolesByPersona = function(personaId) {
  return this.find({ persona: personaId, activo: true }).populate('rol');
};

const PersonaRol = mongoose.model('PersonaRol', personaRolSchema);

module.exports = PersonaRol;