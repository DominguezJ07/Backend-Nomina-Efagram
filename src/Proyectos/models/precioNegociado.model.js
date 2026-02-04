const mongoose = require('mongoose');

const precioNegociadoSchema = new mongoose.Schema({
  proyecto_actividad_lote: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProyectoActividadLote',
    required: [true, 'El PAL es obligatorio']
  },
  precio_acordado: {
    type: Number,
    required: [true, 'El precio acordado es obligatorio'],
    min: [0, 'El precio no puede ser negativo']
  },
  // Versionado
  version: {
    type: Number,
    default: 1,
    min: 1
  },
  fecha_negociacion: {
    type: Date,
    default: Date.now
  },
  fecha_vigencia_desde: {
    type: Date,
    required: [true, 'La fecha de vigencia desde es obligatoria'],
    default: Date.now
  },
  fecha_vigencia_hasta: {
    type: Date
  },
  // Autorización
  negociado_por: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: [true, 'Debe especificar quién negoció']
  },
  autorizado_por: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona'
  },
  motivo: {
    type: String,
    trim: true
  },
  activo: {
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
precioNegociadoSchema.index({ proyecto_actividad_lote: 1, version: 1 });
precioNegociadoSchema.index({ activo: 1 });

// Al crear un nuevo precio, incrementar versión automáticamente
precioNegociadoSchema.pre('save', async function() {
  if (this.isNew) {
    const ultimoPrecio = await this.constructor
      .findOne({ proyecto_actividad_lote: this.proyecto_actividad_lote })
      .sort({ version: -1 });
    
    if (ultimoPrecio) {
      this.version = ultimoPrecio.version + 1;
      
      // Desactivar el precio anterior
      ultimoPrecio.activo = false;
      ultimoPrecio.fecha_vigencia_hasta = new Date();
      await ultimoPrecio.save();
    }
  }
});

const PrecioNegociado = mongoose.model('PrecioNegociado', precioNegociadoSchema);

module.exports = PrecioNegociado;
