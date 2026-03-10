// ==========================================
// MODELO: REGISTRO DIARIO PROGRAMACIÓN
// ==========================================
// Descripción: Define los registros diarios de ejecución
// dentro de una programación semanal
// Ubicación: src/Proyectos/models/registroDiarioProgramacion.model.js

const mongoose = require('mongoose');

const registroDiarioProgramacionSchema = new mongoose.Schema(
  {
    // ── REFERENCIA A PROGRAMACIÓN ──────────────────────────────────
    programacion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Programacion',
      required: [true, 'La programación es obligatoria'],
    },

    // ── FECHA DEL REGISTRO ─────────────────────────────────────────
    fecha: {
      type: Date,
      required: [true, 'La fecha es obligatoria'],
    },

    // ── CANTIDAD EJECUTADA ESE DÍA ─────────────────────────────────
    cantidad_ejecutada: {
      type: Number,
      default: 0,
      min: [0, 'La cantidad ejecutada no puede ser negativa'],
    },

    // ── ESTADO DEL DÍA ─────────────────────────────────────────────
    estado: {
      type: String,
      enum: ['PENDIENTE', 'COMPLETADO', 'PARCIAL'],
      default: 'PENDIENTE',
    },

    // ── USUARIO QUE REGISTRÓ ───────────────────────────────────────
    registrado_por: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Persona',
      default: null,
    },

    // ── OBSERVACIONES DEL DÍA ──────────────────────────────────────
    observaciones: {
      type: String,
      trim: true,
      default: '',
    },

    // ── VALIDADO/REVISADO ─────────────────────────────────────────
    validado: {
      type: Boolean,
      default: false,
    },

    validado_por: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Persona',
      default: null,
    },

    fecha_validacion: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ── ÍNDICES PARA PERFORMANCE ────────────────────────────────────────
registroDiarioProgramacionSchema.index({ programacion: 1 });
registroDiarioProgramacionSchema.index({ fecha: 1 });
registroDiarioProgramacionSchema.index({ estado: 1 });
registroDiarioProgramacionSchema.index({ programacion: 1, fecha: 1 }, { unique: true });

// ── MIDDLEWARE: Cambiar estado según cantidad ejecutada ─────────────
registroDiarioProgramacionSchema.pre('save', function (next) {
  if (this.cantidad_ejecutada > 0) {
    this.estado = 'COMPLETADO';
  } else if (this.cantidad_ejecutada === 0) {
    this.estado = 'PENDIENTE';
  }
  next();
});

// ── MIDDLEWARE: Actualizar cantidad total en Programación ──────────
registroDiarioProgramacionSchema.post('save', async function () {
  try {
    // Obtener la programación
    const Programacion = mongoose.model('Programacion');
    const programacion = await Programacion.findById(this.programacion);

    if (programacion) {
      // Calcular total ejecutado sumando todos los registros del día
      const registros = await mongoose
        .model('RegistroDiarioProgramacion')
        .find({ programacion: this.programacion });

      const totalEjecutado = registros.reduce(
        (sum, reg) => sum + (reg.cantidad_ejecutada || 0),
        0
      );

      // Actualizar cantidad total en programación
      programacion.cantidad_ejecutada_total = totalEjecutado;
      await programacion.actualizarPorcentaje();

      // Verificar si la programación está completada
      const completados = registros.filter(r => r.estado === 'COMPLETADO').length;
      if (completados === 7 && programacion.estado === 'ACTIVA') {
        await programacion.marcarCompletada();
      }
    }
  } catch (error) {
    console.error('Error actualizando Programación:', error);
  }
});

// ── MÉTODO: Obtener el día de la semana ────────────────────────────
registroDiarioProgramacionSchema.methods.obtenerDiaLiteral = function () {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return dias[new Date(this.fecha).getDay()];
};

// ── MÉTODO: Marcar como completado ────────────────────────────────
registroDiarioProgramacionSchema.methods.marcarCompletado = function (cantidad) {
  this.cantidad_ejecutada = cantidad || this.cantidad_ejecutada;
  this.estado = this.cantidad_ejecutada > 0 ? 'COMPLETADO' : 'PENDIENTE';
  return this.save();
};

// ── MÉTODO: Validar el registro ────────────────────────────────────
registroDiarioProgramacionSchema.methods.validar = function (validado_por) {
  this.validado = true;
  this.validado_por = validado_por;
  this.fecha_validacion = new Date();
  return this.save();
};

module.exports = mongoose.model(
  'RegistroDiarioProgramacion',
  registroDiarioProgramacionSchema
);