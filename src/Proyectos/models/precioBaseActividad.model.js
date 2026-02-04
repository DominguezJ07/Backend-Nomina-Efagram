const mongoose = require('mongoose');

const precioBaseActividadSchema = new mongoose.Schema({
  actividad: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ActividadCatalogo',
    required: [true, 'La actividad es obligatoria']
  },
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: [true, 'El cliente es obligatorio']
  },
  // Precio que cobra EFAGRAM al cliente (INMUTABLE para Smurfit)
  precio_cliente: {
    type: Number,
    required: [true, 'El precio al cliente es obligatorio'],
    min: [0, 'El precio no puede ser negativo']
  },
  // Precio base sugerido para trabajador (margen)
  precio_base_trabajador: {
    type: Number,
    required: [true, 'El precio base al trabajador es obligatorio'],
    min: [0, 'El precio no puede ser negativo']
  },
  // Fechas de vigencia
  fecha_vigencia_desde: {
    type: Date,
    required: [true, 'La fecha de vigencia desde es obligatoria'],
    default: Date.now
  },
  fecha_vigencia_hasta: {
    type: Date
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
precioBaseActividadSchema.index({ actividad: 1, cliente: 1, activo: 1 });
precioBaseActividadSchema.index({ fecha_vigencia_desde: 1 });

// REGLA DE NEGOCIO: Precio cliente NO puede modificarse si es Smurfit
precioBaseActividadSchema.pre('save', async function() {
  if (this.isModified('precio_cliente') && !this.isNew) {
    const Cliente = mongoose.model('Cliente');
    const cliente = await Cliente.findById(this.cliente);
    
    if (cliente && cliente.razon_social.toUpperCase().includes('SMURFIT')) {
      throw new Error('El precio al cliente Smurfit NO puede modificarse');
    }
  }
});

// Método para calcular margen
precioBaseActividadSchema.methods.calcularMargen = function() {
  if (this.precio_cliente === 0) return 0;
  return ((this.precio_cliente - this.precio_base_trabajador) / this.precio_cliente) * 100;
};

const PrecioBaseActividad = mongoose.model('PrecioBaseActividad', precioBaseActividadSchema);

module.exports = PrecioBaseActividad;