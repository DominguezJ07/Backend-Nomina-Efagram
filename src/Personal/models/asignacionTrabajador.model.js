const mongoose = require('mongoose');

const asignacionTrabajadorSchema = new mongoose.Schema({
  trabajador: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Persona',
    required: [true, 'El trabajador es obligatorio']
  },
  proyecto_actividad_lote: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProyectoActividadLote',
    required: [true, 'El proyecto-actividad-lote es obligatorio']
  },
  cuadrilla: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cuadrilla',
    default: null
  },
  fecha_inicio: {
    type: Date,
    required: [true, 'La fecha de inicio es obligatoria'],
    default: Date.now
  },
  fecha_fin: {
    type: Date,
    default: null
  },
  horario: {
    hora_entrada: {
      type: String,
      default: '07:00'
    },
    hora_salida: {
      type: String,
      default: '17:00'
    }
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
asignacionTrabajadorSchema.index({ trabajador: 1, activa: 1 });
asignacionTrabajadorSchema.index({ proyecto_actividad_lote: 1 });
asignacionTrabajadorSchema.index({ cuadrilla: 1 });

// Validación de fechas
asignacionTrabajadorSchema.pre('save', function() {
  if (this.fecha_fin && this.fecha_fin < this.fecha_inicio) {
    throw new Error('La fecha fin no puede ser menor a la fecha de inicio');
  }
});

// Método estático para obtener asignaciones de un trabajador
asignacionTrabajadorSchema.statics.getAsignacionesByTrabajador = function(trabajadorId) {
  return this.find({ trabajador: trabajadorId, activa: true })
    .populate('proyecto_actividad_lote')
    .populate('cuadrilla');
};

const AsignacionTrabajador = mongoose.model('AsignacionTrabajador', asignacionTrabajadorSchema);

module.exports = AsignacionTrabajador;
