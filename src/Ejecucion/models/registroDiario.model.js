const mongoose = require('mongoose');

const registroDiarioSchema = new mongoose.Schema({
  // Identificación única
  codigo: {
    type: String,
    required: [true, 'El código es obligatorio'],
    unique: true,
    uppercase: true,
    trim: true
  },
  
  // Fecha del registro
  fecha: {
    type: Date,
    required: [true, 'La fecha es obligatoria'],
    index: true
  },
  
  // Trabajador
  trabajador: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: false,
    default: null
  },
  
  // PAL (Proyecto-Actividad-Lote)
  proyecto_actividad_lote: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProyectoActividadLote',
    required: false,
    default: null
  },
  
  // Cuadrilla (opcional)
  cuadrilla: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cuadrilla',
    default: null
  },
  
  // Cantidad ejecutada en el día
  cantidad_ejecutada: {
    type: Number,
    required: [true, 'La cantidad ejecutada es obligatoria'],
    min: [0, 'La cantidad no puede ser negativa']
  },
  
  // Horas trabajadas
  horas_trabajadas: {
    type: Number,
    default: 8,
    min: [0, 'Las horas no pueden ser negativas'],
    max: [24, 'Las horas no pueden ser más de 24']
  },
  
  // Horario
  hora_inicio: {
    type: String,
    default: '07:00'
  },
  hora_fin: {
    type: String,
    default: '17:00'
  },
  
  // Supervisor que registra (OPCIONAL)
  registrado_por: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: false,
    default: null
  },
  
  // Observaciones
  observaciones: {
    type: String,
    trim: true
  },
  
  // Estado del registro
  estado: {
    type: String,
    enum: ['PENDIENTE', 'APROBADO', 'RECHAZADO', 'CORREGIDO'],
    default: 'APROBADO'
  },
  
  // Control de edición
  editado: {
    type: Boolean,
    default: false
  },
  fecha_edicion: {
    type: Date
  },
  editado_por: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona'
  },
  motivo_edicion: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Índices compuestos - solo aplica unique cuando trabajador NO es null
registroDiarioSchema.index(
  { fecha: 1, trabajador: 1, proyecto_actividad_lote: 1 },
  { 
    unique: true,
    partialFilterExpression: { 
      trabajador: { $type: 'objectId' },
      proyecto_actividad_lote: { $type: 'objectId' }
    }
  }
);
registroDiarioSchema.index({ trabajador: 1, fecha: -1 });
registroDiarioSchema.index({ proyecto_actividad_lote: 1, fecha: -1 });
registroDiarioSchema.index({ registrado_por: 1, fecha: -1 });

// REGLA: Un trabajador solo puede tener UN registro por día por PAL (solo si ambos existen)
registroDiarioSchema.pre('save', async function() {
  if (this.isNew && this.trabajador && this.proyecto_actividad_lote) {
    const existente = await this.constructor.findOne({
      fecha: this.fecha,
      trabajador: this.trabajador,
      proyecto_actividad_lote: this.proyecto_actividad_lote
    });
    
    if (existente) {
      throw new Error('Ya existe un registro para este trabajador en esta fecha y PAL');
    }
  }
});

// Método para marcar como editado
registroDiarioSchema.methods.marcarEditado = function(editadoPor, motivo) {
  this.editado = true;
  this.fecha_edicion = new Date();
  this.editado_por = editadoPor;
  this.motivo_edicion = motivo;
  return this.save();
};

// Método estático para obtener registros de una semana
registroDiarioSchema.statics.getRegistrosSemana = function(fechaInicio, fechaFin, filtros = {}) {
  return this.find({
    fecha: { $gte: fechaInicio, $lte: fechaFin },
    ...filtros
  })
    .populate('trabajador')
    .populate('proyecto_actividad_lote')
    .populate('cuadrilla')
    .populate('registrado_por')
    .sort({ fecha: 1 });
};

// Método estático para obtener registros por trabajador
registroDiarioSchema.statics.getRegistrosByTrabajador = function(trabajadorId, fechaInicio, fechaFin) {
  return this.find({
    trabajador: trabajadorId,
    fecha: { $gte: fechaInicio, $lte: fechaFin }
  })
    .populate('proyecto_actividad_lote')
    .sort({ fecha: -1 });
};

const RegistroDiario = mongoose.model('RegistroDiario', registroDiarioSchema);

module.exports = RegistroDiario;