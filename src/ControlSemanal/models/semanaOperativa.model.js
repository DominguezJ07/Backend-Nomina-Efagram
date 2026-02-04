const mongoose = require('mongoose');

const semanaOperativaSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: [true, 'El código es obligatorio'],
    unique: true,
    uppercase: true,
    trim: true
  },
  
  // Rango de la semana (JUEVES a JUEVES)
  fecha_inicio: {
    type: Date,
    required: [true, 'La fecha de inicio es obligatoria']
  },
  fecha_fin: {
    type: Date,
    required: [true, 'La fecha de fin es obligatoria']
  },
  
  // Año y número de semana
  año: {
    type: Number,
    required: true
  },
  numero_semana: {
    type: Number,
    required: true,
    min: 1,
    max: 53
  },
  
  // Proyecto (opcional - puede ser transversal)
  proyecto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proyecto',
    default: null
  },
  
  // Núcleo o zona (para organización)
  nucleo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Nucleo',
    default: null
  },
  
  // Estado
  estado: {
    type: String,
    enum: ['ABIERTA', 'CERRADA', 'BLOQUEADA'],
    default: 'ABIERTA'
  },
  
  // Control de cierre
  cerrada_por: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona'
  },
  fecha_cierre: {
    type: Date
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
semanaOperativaSchema.index({ año: 1, numero_semana: 1 });
semanaOperativaSchema.index({ fecha_inicio: 1, fecha_fin: 1 });
semanaOperativaSchema.index({ estado: 1 });

// Validación: fecha_fin debe ser después de fecha_inicio
semanaOperativaSchema.pre('save', function() {
  if (this.fecha_fin <= this.fecha_inicio) {
    throw new Error('La fecha fin debe ser posterior a la fecha inicio');
  }
  
  // Validar que la diferencia sea aproximadamente 7 días
  const diff = Math.abs(this.fecha_fin - this.fecha_inicio) / (1000 * 60 * 60 * 24);
  if (diff < 6 || diff > 8) {
    throw new Error('Una semana operativa debe tener aproximadamente 7 días');
  }
});

// REGLA: No puede cerrar si hay PALs sin cumplir meta
semanaOperativaSchema.pre('save', async function() {
  if (this.isModified('estado') && this.estado === 'CERRADA' && !this.isNew) {
    const ProyectoActividadLote = mongoose.model('ProyectoActividadLote');
    const RegistroDiario = mongoose.model('RegistroDiario');
    
    // Obtener todos los registros de la semana
    const registros = await RegistroDiario.find({
      fecha: { $gte: this.fecha_inicio, $lte: this.fecha_fin }
    }).distinct('proyecto_actividad_lote');
    
    // Verificar cada PAL
    for (const palId of registros) {
      const pal = await ProyectoActividadLote.findById(palId);
      if (pal && !pal.cumplioMeta && pal.estado !== 'CANCELADA') {
        throw new Error(
          `No se puede cerrar la semana. PAL ${pal.codigo} no ha cumplido la meta mínima`
        );
      }
    }
  }
});

// Método para cerrar semana
semanaOperativaSchema.methods.cerrar = async function(cerradoPorId) {
  this.estado = 'CERRADA';
  this.cerrada_por = cerradoPorId;
  this.fecha_cierre = new Date();
  await this.save();
  return this;
};

// Método estático para obtener semana actual
semanaOperativaSchema.statics.getSemanaActual = function() {
  const hoy = new Date();
  return this.findOne({
    fecha_inicio: { $lte: hoy },
    fecha_fin: { $gte: hoy },
    estado: 'ABIERTA'
  });
};

// Método estático para verificar si puede cerrar
semanaOperativaSchema.statics.puedeObtener = async function(semanaId) {
  const semana = await this.findById(semanaId);
  if (!semana) {
    throw new Error('Semana no encontrada');
  }
  
  if (semana.estado === 'CERRADA') {
    return { puede: false, motivo: 'La semana ya está cerrada' };
  }
  
  const ProyectoActividadLote = mongoose.model('ProyectoActividadLote');
  const RegistroDiario = mongoose.model('RegistroDiario');
  
  const registros = await RegistroDiario.find({
    fecha: { $gte: semana.fecha_inicio, $lte: semana.fecha_fin }
  }).distinct('proyecto_actividad_lote');
  
  const palsIncumplidos = [];
  
  for (const palId of registros) {
    const pal = await ProyectoActividadLote.findById(palId);
    if (pal && !pal.cumplioMeta && pal.estado !== 'CANCELADA') {
      palsIncumplidos.push({
        codigo: pal.codigo,
        metaMinima: pal.meta_minima,
        ejecutado: pal.cantidad_ejecutada,
        faltante: pal.meta_minima - pal.cantidad_ejecutada
      });
    }
  }
  
  if (palsIncumplidos.length > 0) {
    return {
      puede: false,
      motivo: `${palsIncumplidos.length} PAL(s) sin cumplir meta mínima`,
      pals: palsIncumplidos
    };
  }
  
  return { puede: true, motivo: 'Todas las metas cumplidas' };
};

const SemanaOperativa = mongoose.model('SemanaOperativa', semanaOperativaSchema);

module.exports = SemanaOperativa;
