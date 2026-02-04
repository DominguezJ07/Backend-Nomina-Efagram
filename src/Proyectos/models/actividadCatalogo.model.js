const mongoose = require('mongoose');
const { UNIDADES_MEDIDA } = require('../../config/constants');

const actividadCatalogoSchema = new mongoose.Schema({
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
  descripcion: {
    type: String,
    trim: true
  },
  categoria: {
    type: String,
    enum: ['PREPARACION_TERRENO', 'SIEMBRA', 'MANTENIMIENTO', 'CONTROL_MALEZA', 'FERTILIZACION', 'PODAS', 'OTRO'],
    default: 'OTRO'
  },
  unidad_medida: {
    type: String,
    enum: Object.values(UNIDADES_MEDIDA),
    required: [true, 'La unidad de medida es obligatoria']
  },
  // Rendimientos estimados
  rendimiento_diario_estimado: {
    type: Number,
    min: 0,
    comment: 'Cantidad estimada que un trabajador puede realizar en un día'
  },
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
actividadCatalogoSchema.index({ codigo: 1 });
actividadCatalogoSchema.index({ categoria: 1 });
actividadCatalogoSchema.index({ activa: 1 });

const ActividadCatalogo = mongoose.model('ActividadCatalogo', actividadCatalogoSchema);

module.exports = ActividadCatalogo;