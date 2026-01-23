 const mongoose = require('mongoose');

const loteSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: [true, 'El código del lote es obligatorio'],
    trim: true,
    uppercase: true
  },
  nombre: {
    type: String,
    required: [true, 'El nombre del lote es obligatorio'],
    trim: true
  },
  finca: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Finca',
    required: [true, 'La finca es obligatoria']
  },
  area: {
    type: Number,
    min: [0, 'El área no puede ser negativa'],
    required: [true, 'El área es obligatoria']
  },
  condiciones_especiales: {
    type: String,
    trim: true
  },
  activo: {
    type: Boolean,
    default: true
  },
  // Campos adicionales para silvicultura
  tipo_suelo: {
    type: String,
    trim: true
  },
  pendiente: {
    type: String,
    enum: ['Plana', 'Ondulada', 'Quebrada', 'Escarpada'],
    default: 'Plana'
  },
  accesibilidad: {
    type: String,
    enum: ['Buena', 'Regular', 'Difícil'],
    default: 'Buena'
  }
}, {
  timestamps: true,
  versionKey: false
});

// Índice compuesto único: código debe ser único por finca
loteSchema.index({ finca: 1, codigo: 1 }, { unique: true });
loteSchema.index({ finca: 1, activo: 1 });

// Método para buscar lotes activos por finca
loteSchema.statics.findByFinca = function(fincaId) {
  return this.find({ finca: fincaId, activo: true })
    .populate({
      path: 'finca',
      populate: {
        path: 'nucleo',
        populate: { path: 'zona' }
      }
    });
};

// Método para obtener la jerarquía completa del lote
loteSchema.methods.getJerarquia = async function() {
  await this.populate({
    path: 'finca',
    populate: {
      path: 'nucleo',
      populate: { path: 'zona' }
    }
  });

  return {
    lote: {
      id: this._id,
      codigo: this.codigo,
      nombre: this.nombre
    },
    finca: {
      id: this.finca._id,
      codigo: this.finca.codigo,
      nombre: this.finca.nombre
    },
    nucleo: {
      id: this.finca.nucleo._id,
      codigo: this.finca.nucleo.codigo,
      nombre: this.finca.nucleo.nombre
    },
    zona: {
      id: this.finca.nucleo.zona._id,
      codigo: this.finca.nucleo.zona.codigo,
      nombre: this.finca.nucleo.zona.nombre
    }
  };
};

// Middleware pre-save para validar que la finca exista
loteSchema.pre('save', async function(next) {
  if (this.isModified('finca')) {
    const Finca = mongoose.model('Finca');
    const fincaExists = await Finca.findById(this.finca);
    
    if (!fincaExists) {
      throw new Error('La finca especificada no existe');
    }
  }
});

loteSchema.set('toJSON', { virtuals: true });
loteSchema.set('toObject', { virtuals: true });

const Lote = mongoose.model('Lote', loteSchema);

module.exports = Lote;
