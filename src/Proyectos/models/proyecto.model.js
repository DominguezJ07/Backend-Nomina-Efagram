const mongoose = require('mongoose');
const { ESTADOS_PROYECTO, TIPOS_CONTRATO } = require('../../config/constants');

const proyectoSchema = new mongoose.Schema({
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
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: [true, 'El cliente es obligatorio']
  },
  // Fechas
  fecha_inicio: {
    type: Date,
    required: [true, 'La fecha de inicio es obligatoria']
  },
  fecha_fin_estimada: {
    type: Date
  },
  fecha_fin_real: {
    type: Date
  },
  // Financiero
  tipo_contrato: {
    type: String,
    enum: Object.values(TIPOS_CONTRATO),
    default: TIPOS_CONTRATO.FIJO_TODO_COSTO
  },
  valor_contrato: {
    type: Number,
    min: 0
  },
  
  // ===== NUEVO: PRESUPUESTO ANUAL =====
  presupuesto_anual: {
    // Cantidad total de actividades planeadas para el año
    cantidad_actividades_planeadas: {
      type: Number,
      min: [0, 'La cantidad de actividades no puede ser negativa'],
      default: 0
    },
    
    // Presupuesto total asignado para el año
    monto_presupuestado: {
      type: Number,
      min: [0, 'El presupuesto no puede ser negativo'],
      default: 0
    },
    
    // Año fiscal
    año_fiscal: {
      type: Number,
      validate: {
        validator: function(v) {
          return v >= 2020 && v <= 2100;
        },
        message: 'El año fiscal debe estar entre 2020 y 2100'
      }
    },
    
    // Fecha de aprobación del presupuesto
    fecha_aprobacion: {
      type: Date
    },
    
    // Usuario que aprobó el presupuesto
    aprobado_por: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Persona'
    },
    
    // Observaciones sobre el presupuesto
    observaciones_presupuesto: {
      type: String,
      trim: true,
      maxlength: [500, 'Las observaciones no pueden exceder 500 caracteres']
    }
  },

  // ===== NUEVO: DESGLOSE POR TIPO DE INTERVENCIÓN =====
  presupuesto_por_intervencion: {
    mantenimiento: {
      cantidad_actividades: { type: Number, default: 0, min: 0 },
      monto_presupuestado: { type: Number, default: 0, min: 0 }
    },
    no_programadas: {
      cantidad_actividades: { type: Number, default: 0, min: 0 },
      monto_presupuestado: { type: Number, default: 0, min: 0 }
    },
    establecimiento: {
      cantidad_actividades: { type: Number, default: 0, min: 0 },
      monto_presupuestado: { type: Number, default: 0, min: 0 }
    }
  },
  
  // Estado
  estado: {
    type: String,
    enum: Object.values(ESTADOS_PROYECTO),
    default: ESTADOS_PROYECTO.PLANEADO
  },
  // Control
  responsable: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona'
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
proyectoSchema.index({ codigo: 1 });
proyectoSchema.index({ cliente: 1 });
proyectoSchema.index({ estado: 1 });
proyectoSchema.index({ fecha_inicio: 1 });
proyectoSchema.index({ 'presupuesto_anual.año_fiscal': 1 });

// Validación: fecha fin no puede ser menor a fecha inicio
proyectoSchema.pre('save', function() {
  if (this.fecha_fin_estimada && this.fecha_fin_estimada < this.fecha_inicio) {
    throw new Error('La fecha fin estimada no puede ser menor a la fecha de inicio');
  }
  if (this.fecha_fin_real && this.fecha_fin_real < this.fecha_inicio) {
    throw new Error('La fecha fin real no puede ser menor a la fecha de inicio');
  }
  
  // Validación: el desglose por intervención debe sumar al total
  if (this.presupuesto_anual && this.presupuesto_por_intervencion) {
    const totalActividades = 
      (this.presupuesto_por_intervencion.mantenimiento?.cantidad_actividades || 0) +
      (this.presupuesto_por_intervencion.no_programadas?.cantidad_actividades || 0) +
      (this.presupuesto_por_intervencion.establecimiento?.cantidad_actividades || 0);
    
    const totalPresupuesto = 
      (this.presupuesto_por_intervencion.mantenimiento?.monto_presupuestado || 0) +
      (this.presupuesto_por_intervencion.no_programadas?.monto_presupuestado || 0) +
      (this.presupuesto_por_intervencion.establecimiento?.monto_presupuestado || 0);
    
    // Advertencia si los totales no coinciden (solo log, no error)
    if (this.presupuesto_anual.cantidad_actividades_planeadas && 
        totalActividades !== this.presupuesto_anual.cantidad_actividades_planeadas) {
      console.warn(`⚠️ El total de actividades por intervención (${totalActividades}) no coincide con el planeado (${this.presupuesto_anual.cantidad_actividades_planeadas})`);
    }
    
    if (this.presupuesto_anual.monto_presupuestado && 
        totalPresupuesto !== this.presupuesto_anual.monto_presupuestado) {
      console.warn(`⚠️ El total de presupuesto por intervención ($${totalPresupuesto}) no coincide con el planeado ($${this.presupuesto_anual.monto_presupuestado})`);
    }
  }
});

// Virtual para obtener el presupuesto disponible
proyectoSchema.virtual('presupuesto_disponible').get(function() {
  return this.presupuesto_anual?.monto_presupuestado || 0;
});

const Proyecto = mongoose.model('Proyecto', proyectoSchema); 
 
module.exports = Proyecto;