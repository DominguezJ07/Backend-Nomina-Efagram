const mongoose = require('mongoose');

const consolidadoSemanalSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: [true, 'El código es obligatorio'],
    unique: true,
    uppercase: true,
    trim: true
  },
  
  // Semana operativa
  semana_operativa: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SemanaOperativa',
    required: [true, 'La semana operativa es obligatoria']
  },
  
  // Trabajador
  trabajador: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: [true, 'El trabajador es obligatorio']
  },
  
  // PAL
  proyecto_actividad_lote: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProyectoActividadLote',
    required: [true, 'El PAL es obligatorio']
  },
  
  // Métricas de la semana
  dias_trabajados: {
    type: Number,
    default: 0,
    min: 0,
    max: 7
  },
  
  total_horas: {
    type: Number,
    default: 0,
    min: 0
  },
  
  total_ejecutado: {
    type: Number,
    required: [true, 'El total ejecutado es obligatorio'],
    min: 0
  },
  
  // Rendimiento
  promedio_diario: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Cantidad promedio ejecutada por día'
  },
  
  rendimiento_esperado: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Basado en rendimiento_diario_estimado de la actividad'
  },
  
  porcentaje_rendimiento: {
    type: Number,
    default: 0,
    comment: 'Porcentaje de rendimiento vs esperado'
  },
  
  // Cumplimiento
  cumplio_meta_semanal: {
    type: Boolean,
    default: false
  },
  
  // Novedades
  dias_con_novedad: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Observaciones
  observaciones: {
    type: String,
    trim: true
  },
  
  // Estado
  estado: {
    type: String,
    enum: ['BORRADOR', 'CONSOLIDADO', 'APROBADO', 'CERRADO'],
    default: 'BORRADOR'
  },
  
  // Control
  consolidado_por: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona'
  },
  fecha_consolidacion: {
    type: Date
  }
}, {
  timestamps: true,
  versionKey: false
});

// Índices
consolidadoSemanalSchema.index({ semana_operativa: 1, trabajador: 1, proyecto_actividad_lote: 1 }, { unique: true });
consolidadoSemanalSchema.index({ trabajador: 1, semana_operativa: -1 });
consolidadoSemanalSchema.index({ proyecto_actividad_lote: 1 });
consolidadoSemanalSchema.index({ estado: 1 });

// Calcular métricas antes de guardar
consolidadoSemanalSchema.pre('save', function() {
  if (this.dias_trabajados > 0) {
    this.promedio_diario = this.total_ejecutado / this.dias_trabajados;
  }
  
  if (this.rendimiento_esperado > 0) {
    this.porcentaje_rendimiento = (this.promedio_diario / this.rendimiento_esperado) * 100;
  }
});

// Virtual para clasificación de rendimiento
consolidadoSemanalSchema.virtual('clasificacion_rendimiento').get(function() {
  if (this.porcentaje_rendimiento >= 100) return 'EXCELENTE';
  if (this.porcentaje_rendimiento >= 80) return 'BUENO';
  if (this.porcentaje_rendimiento >= 60) return 'REGULAR';
  return 'BAJO';
});

consolidadoSemanalSchema.set('toJSON', { virtuals: true });
consolidadoSemanalSchema.set('toObject', { virtuals: true });

const ConsolidadoSemanal = mongoose.model('ConsolidadoSemanal', consolidadoSemanalSchema);

module.exports = ConsolidadoSemanal;