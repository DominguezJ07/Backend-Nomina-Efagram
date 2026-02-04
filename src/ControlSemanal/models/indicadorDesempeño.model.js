const mongoose = require('mongoose');

const indicadorDesempeñoSchema = new mongoose.Schema({
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
  
  // Alcance del indicador
  tipo_alcance: {
    type: String,
    enum: ['GLOBAL', 'PROYECTO', 'CUADRILLA', 'SUPERVISOR', 'TRABAJADOR'],
    required: [true, 'El tipo de alcance es obligatorio']
  },
  
  referencia: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'tipo_referencia'
  },
  
  tipo_referencia: {
    type: String,
    enum: ['Proyecto', 'Cuadrilla', 'Persona']
  },
  
  // Indicadores de producción
  total_trabajadores: {
    type: Number,
    default: 0
  },
  
  total_dias_trabajados: {
    type: Number,
    default: 0
  },
  
  total_horas: {
    type: Number,
    default: 0
  },
  
  total_produccion: {
    type: Number,
    default: 0
  },
  
  promedio_diario_general: {
    type: Number,
    default: 0
  },
  
  // Indicadores de cumplimiento
  pals_asignados: {
    type: Number,
    default: 0
  },
  
  pals_cumplidos: {
    type: Number,
    default: 0
  },
  
  porcentaje_cumplimiento: {
    type: Number,
    default: 0
  },
  
  // Indicadores de asistencia
  dias_con_novedad: {
    type: Number,
    default: 0
  },
  
  porcentaje_asistencia: {
    type: Number,
    default: 0
  },
  
  // Clasificación de trabajadores
  trabajadores_excelentes: {
    type: Number,
    default: 0
  },
  
  trabajadores_buenos: {
    type: Number,
    default: 0
  },
  
  trabajadores_regulares: {
    type: Number,
    default: 0
  },
  
  trabajadores_bajos: {
    type: Number,
    default: 0
  },
  
  // Alertas
  total_alertas: {
    type: Number,
    default: 0
  },
  
  alertas_criticas: {
    type: Number,
    default: 0
  },
  
  // Observaciones
  observaciones: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Índices
indicadorDesempeñoSchema.index({ semana_operativa: 1, tipo_alcance: 1 });
indicadorDesempeñoSchema.index({ semana_operativa: 1, referencia: 1 });

const IndicadorDesempeño = mongoose.model('IndicadorDesempeño', indicadorDesempeñoSchema);

module.exports = IndicadorDesempeño;