const mongoose = require('mongoose');

const nucleoSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: [true, 'El código del núcleo es obligatorio'],
    trim: true,
    uppercase: true
  },
  nombre: {
    type: String,
    required: [true, 'El nombre del núcleo es obligatorio'],
    trim: true
  },
  zona: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zona',
    required: [true, 'La zona es obligatoria']
  },
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Índice compuesto único: código debe ser único por zona
nucleoSchema.index({ zona: 1, codigo: 1 }, { unique: true });
nucleoSchema.index({ zona: 1, activo: 1 });

// Virtual para obtener fincas del núcleo
nucleoSchema.virtual('fincas', {
  ref: 'Finca',
  localField: '_id',
  foreignField: 'nucleo'
});

// Método para buscar núcleos activos por zona
nucleoSchema.statics.findByZona = function(zonaId) {
  return this.find({ zona: zonaId, activo: true }).populate('zona');
};

// Middleware pre-save para validar que la zona exista
nucleoSchema.pre('save', async function() {
  if (this.isModified('zona')) {
    const Zona = mongoose.model('Zona');
    const zonaExists = await Zona.findById(this.zona);
    
    if (!zonaExists) {
      throw new Error('La zona especificada no existe');
    }
  }
});

nucleoSchema.set('toJSON', { virtuals: true });
nucleoSchema.set('toObject', { virtuals: true });

const Nucleo = mongoose.model('Nucleo', nucleoSchema);

module.exports = Nucleo;