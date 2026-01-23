const mongoose = require('mongoose');

const fincaSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: [true, 'El código de la finca es obligatorio'],
    trim: true,
    uppercase: true
  },
  nombre: {
    type: String,
    required: [true, 'El nombre de la finca es obligatorio'],
    trim: true
  },
  nucleo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Nucleo',
    required: [true, 'El núcleo es obligatorio']
  },
  activa: {
    type: Boolean,
    default: true
  },
  // Campos adicionales opcionales
  ubicacion: {
    latitud: { type: Number },
    longitud: { type: Number }
  },
  area_total: {
    type: Number,
    min: [0, 'El área no puede ser negativa']
  },
  descripcion: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Índice compuesto único: código debe ser único por núcleo
fincaSchema.index({ nucleo: 1, codigo: 1 }, { unique: true });
fincaSchema.index({ nucleo: 1, activa: 1 });

// Virtual para obtener lotes de la finca
fincaSchema.virtual('lotes', {
  ref: 'Lote',
  localField: '_id',
  foreignField: 'finca'
});

// Virtual para obtener la zona a través del núcleo
fincaSchema.virtual('zona', {
  ref: 'Zona',
  localField: 'nucleo',
  foreignField: '_id',
  justOne: true
});

// Método para buscar fincas activas por núcleo
fincaSchema.statics.findByNucleo = function(nucleoId) {
  return this.find({ nucleo: nucleoId, activa: true })
    .populate('nucleo')
    .populate({
      path: 'nucleo',
      populate: { path: 'zona' }
    });
};

// Middleware pre-save para validar que el núcleo exista
fincaSchema.pre('save', async function(next) {
  if (this.isModified('nucleo')) {
    const Nucleo = mongoose.model('Nucleo');
    const nucleoExists = await Nucleo.findById(this.nucleo);
    
    if (!nucleoExists) {
      throw new Error('El núcleo especificado no existe');
    }
  }
});

fincaSchema.set('toJSON', { virtuals: true });
fincaSchema.set('toObject', { virtuals: true });

const Finca = mongoose.model('Finca', fincaSchema);

module.exports = Finca;