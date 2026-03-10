// ==========================================
// MODELO: PROGRAMACIÓN
// ==========================================
// Descripción: Define la estructura de una programación semanal
// que controla la ejecución de un contrato durante 7 días
// Ubicación: src/Proyectos/models/programacion.model.js

const mongoose = require('mongoose');

const programacionSchema = new mongoose.Schema(
  {
    // ── CONTRATO (Referencia) ───────────────────────────────────────
    contrato: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contrato',
      required: [true, 'El contrato es obligatorio'],
    },

    // ── FECHAS ──────────────────────────────────────────────────────
    fecha_inicial: {
      type: Date,
      required: [true, 'La fecha inicial es obligatoria'],
      validate: {
        validator: function (value) {
          // Validar que no sea en el pasado
          return new Date(value) >= new Date(new Date().setHours(0, 0, 0, 0));
        },
        message: 'La fecha inicial no puede ser en el pasado',
      },
    },

    fecha_final: {
      type: Date,
      // Se calcula automáticamente: fecha_inicial + 7 días
      // Aunque se puede guardar para evitar cálculos repetidos
    },

    // ── SEMANA (Calculado) ──────────────────────────────────────────
    semana: {
      type: Number,
      default: 1,
      // Se calcula según la fecha actual respecto a fecha_inicial
    },

    // ── ESTADO ──────────────────────────────────────────────────────
    estado: {
      type: String,
      enum: ['ACTIVA', 'COMPLETADA', 'CANCELADA', 'PAUSADA'],
      default: 'ACTIVA',
    },

    // ── DATOS PROYECTADOS (Heredados del contrato) ──────────────────
    cantidad_proyectada: {
      type: Number,
      required: [true, 'La cantidad proyectada es obligatoria'],
      min: [0.01, 'La cantidad proyectada debe ser mayor a 0'],
    },

    valor_proyectado: {
      type: Number,
      required: [true, 'El valor proyectado es obligatorio'],
      min: [0, 'El valor proyectado debe ser mayor o igual a 0'],
    },

    // ── REFERENCIAS A DATOS DEL CONTRATO ────────────────────────────
    actividad: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ActividadCatalogo',
      required: [true, 'La actividad es obligatoria'],
    },

    finca: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Finca',
      required: [true, 'La finca es obligatoria'],
    },

    lote: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lote',
      required: [true, 'El lote es obligatorio'],
    },

    // ── CÁLCULOS AUTOMÁTICOS ───────────────────────────────────────
    // Cantidad Total Ejecutada (suma de todos los días)
    cantidad_ejecutada_total: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Porcentaje de cumplimiento
    porcentaje_cumplimiento: {
      type: Number,
      default: 0,
      min: 0,
      max: 200, // Permitir >100% en caso de sobre-cumplimiento
    },

    // ── TRAZABILIDAD ────────────────────────────────────────────────
    creado_por: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Persona',
      default: null,
    },

    actualizado_por: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Persona',
      default: null,
    },

    // ── OBSERVACIONES ───────────────────────────────────────────────
    observaciones: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── ÍNDICES PARA PERFORMANCE ────────────────────────────────────────
programacionSchema.index({ contrato: 1 });
programacionSchema.index({ fecha_inicial: 1 });
programacionSchema.index({ estado: 1 });
programacionSchema.index({ finca: 1 });
programacionSchema.index({ actividad: 1 });
programacionSchema.index({ contrato: 1, fecha_inicial: 1 }, { unique: false });

// ── VIRTUAL: Días restantes ────────────────────────────────────────
programacionSchema.virtual('dias_restantes').get(function () {
  const hoy = new Date();
  const finalDate = new Date(this.fecha_final);
  const diferencia = finalDate.getTime() - hoy.getTime();
  const dias = Math.ceil(diferencia / (1000 * 3600 * 24));
  return Math.max(0, dias);
});

// ── VIRTUAL: Estado de la semana (En progreso, Completada, etc.) ────
programacionSchema.virtual('estado_semana').get(function () {
  if (this.estado === 'COMPLETADA') return 'COMPLETADA';
  if (this.estado === 'CANCELADA') return 'CANCELADA';
  if (this.dias_restantes <= 0) return 'EXPIRADA';
  if (this.dias_restantes <= 2) return 'POR VENCER';
  return 'EN PROGRESO';
});

// ── MIDDLEWARE: Calcular fecha_final antes de guardar ────────────────
programacionSchema.pre('save', function (next) {
  // Calcular fecha final (7 días después de fecha inicial)
  if (this.fecha_inicial && !this.fecha_final) {
    const fechaFinal = new Date(this.fecha_inicial);
    fechaFinal.setDate(fechaFinal.getDate() + 7);
    this.fecha_final = fechaFinal;
  }

  // Calcular semana (1, 2, 3, etc. basado en fecha actual)
  if (this.fecha_inicial) {
    const hoy = new Date();
    const diferencia = hoy.getTime() - new Date(this.fecha_inicial).getTime();
    const dias = Math.floor(diferencia / (1000 * 3600 * 24));
    this.semana = Math.max(1, Math.floor(dias / 7) + 1);
  }

  next();
});

// ── MIDDLEWARE: Validar que no exista otra programación igual ───────
programacionSchema.pre('save', async function (next) {
  if (this.isNew) {
    const existente = await mongoose.model('Programacion').findOne({
      contrato: this.contrato,
      fecha_inicial: this.fecha_inicial,
      _id: { $ne: this._id },
    });

    if (existente) {
      throw new Error(
        'Ya existe una programación para este contrato en esta fecha'
      );
    }
  }
  next();
});

// ── MÉTODO: Actualizar porcentaje ──────────────────────────────────
programacionSchema.methods.actualizarPorcentaje = function () {
  if (this.cantidad_proyectada > 0) {
    this.porcentaje_cumplimiento = Math.round(
      (this.cantidad_ejecutada_total / this.cantidad_proyectada) * 100
    );
  }
  return this.save();
};

// ── MÉTODO: Verificar si está completada ───────────────────────────
programacionSchema.methods.estaCompletada = async function () {
  const registros = await mongoose.model('RegistroDiarioProgramacion').find({
    programacion: this._id,
    estado: 'COMPLETADO',
  });

  // Debe tener 7 registros completados
  return registros.length === 7;
};

// ── MÉTODO: Marcar como completada ────────────────────────────────
programacionSchema.methods.marcarCompletada = async function () {
  this.estado = 'COMPLETADA';
  return this.save();
};

// ── MÉTODO: Obtener todos los registros diarios ──────────────────
programacionSchema.methods.obtenerRegistrosDiarios = function () {
  return mongoose
    .model('RegistroDiarioProgramacion')
    .find({ programacion: this._id })
    .sort({ fecha: 1 });
};

// ── MÉTODO: Obtener resumen de la semana ─────────────────────────
programacionSchema.methods.obtenerResumen = async function () {
  const registros = await this.obtenerRegistrosDiarios();

  return {
    programacion_id: this._id,
    contrato: this.contrato,
    fecha_inicial: this.fecha_inicial,
    fecha_final: this.fecha_final,
    semana: this.semana,
    estado: this.estado,
    cantidad_proyectada: this.cantidad_proyectada,
    cantidad_ejecutada_total: this.cantidad_ejecutada_total,
    porcentaje_cumplimiento: this.porcentaje_cumplimiento,
    registros_diarios: registros.map(r => ({
      fecha: r.fecha,
      cantidad_ejecutada: r.cantidad_ejecutada,
      estado: r.estado,
    })),
  };
};

module.exports = mongoose.model('Programacion', programacionSchema);