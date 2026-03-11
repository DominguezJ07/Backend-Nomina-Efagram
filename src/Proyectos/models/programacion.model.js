// ==========================================
// MODELO: PROGRAMACIÓN — VERSIÓN CORREGIDA
// ==========================================
// BUGS CORREGIDOS:
//
// BUG #1 — "next is not a function":
//   Los pre-save hooks async NO deben recibir `next` como parámetro
//   ni llamar `next()` en Mongoose v6+. En Mongoose moderno los hooks
//   async se resuelven con return (éxito) o throw (error).
//   FIX: convertir los dos hooks a async sin `next`, usar throw para errores.
//
// BUG #2 — fecha_final = fecha_inicial + 7 días (debería ser +6):
//   Una semana de 7 días va del día 0 al día 6 (= +6 días, no +7).
//   Con +7 la semana tiene 8 días.
//   FIX: setDate(getDate() + 6).

const mongoose = require('mongoose');

const programacionSchema = new mongoose.Schema(
  {
    contrato: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contrato',
      required: [true, 'El contrato es obligatorio'],
    },

    fecha_inicial: {
      type: Date,
      required: [true, 'La fecha inicial es obligatoria'],
    },

    fecha_final: {
      type: Date,
    },

    semana: {
      type: Number,
      default: 1,
    },

    estado: {
      type: String,
      enum: ['ACTIVA', 'COMPLETADA', 'CANCELADA', 'PAUSADA'],
      default: 'ACTIVA',
    },

    cantidad_proyectada: {
      type: Number,
      default: 1,
      min: [0, 'La cantidad proyectada debe ser mayor o igual a 0'],
    },

    valor_proyectado: {
      type: Number,
      default: 0,
      min: [0, 'El valor proyectado debe ser mayor o igual a 0'],
    },

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

    cantidad_ejecutada_total: {
      type: Number,
      default: 0,
      min: 0,
    },

    porcentaje_cumplimiento: {
      type: Number,
      default: 0,
      min: 0,
      max: 200,
    },

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

// ── ÍNDICES ───────────────────────────────────────────────────────────
programacionSchema.index({ contrato: 1 });
programacionSchema.index({ fecha_inicial: 1 });
programacionSchema.index({ estado: 1 });
programacionSchema.index({ finca: 1 });
programacionSchema.index({ actividad: 1 });
programacionSchema.index({ contrato: 1, fecha_inicial: 1 }, { unique: false });

// ── VIRTUAL: Días restantes ───────────────────────────────────────────
programacionSchema.virtual('dias_restantes').get(function () {
  const hoy      = new Date();
  const fin      = new Date(this.fecha_final);
  const diff     = fin.getTime() - hoy.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
});

// ── VIRTUAL: Estado de la semana ──────────────────────────────────────
programacionSchema.virtual('estado_semana').get(function () {
  if (this.estado === 'COMPLETADA') return 'COMPLETADA';
  if (this.estado === 'CANCELADA')  return 'CANCELADA';
  if (this.dias_restantes <= 0)     return 'EXPIRADA';
  if (this.dias_restantes <= 2)     return 'POR VENCER';
  return 'EN PROGRESO';
});

// ── PRE-SAVE #1: Calcular fecha_final y semana ────────────────────────
// ✅ FIX BUG #1: async sin `next` (Mongoose v6+ resuelve con return/throw)
// ✅ FIX BUG #2: +6 días (semana = día 0 al día 6 = 7 días total)
programacionSchema.pre('save', async function () {
  // Calcular fecha_final solo si no fue seteada explícitamente
  if (this.fecha_inicial && !this.fecha_final) {
    const fechaFinal = new Date(this.fecha_inicial);
    fechaFinal.setDate(fechaFinal.getDate() + 6); // ✅ +6 = 7 días
    this.fecha_final = fechaFinal;
  }

  // Calcular número de semana relativo a fecha_inicial
  if (this.fecha_inicial) {
    const hoy       = new Date();
    const diff      = hoy.getTime() - new Date(this.fecha_inicial).getTime();
    const dias      = Math.floor(diff / (1000 * 3600 * 24));
    this.semana     = Math.max(1, Math.floor(dias / 7) + 1);
  }
  // No retorna nada = éxito en Mongoose v6+
});

// ── PRE-SAVE #2: Validar que no exista duplicado ──────────────────────
// ✅ FIX BUG #1: async sin `next`, usa throw para errores
programacionSchema.pre('save', async function () {
  if (this.isNew) {
    const existente = await mongoose.model('Programacion').findOne({
      contrato:      this.contrato,
      fecha_inicial: this.fecha_inicial,
      _id:           { $ne: this._id },
    });

    if (existente) {
      throw new Error('Ya existe una programación para este contrato en esta fecha');
    }
  }
});

// ── MÉTODOS ───────────────────────────────────────────────────────────
programacionSchema.methods.actualizarPorcentaje = function () {
  if (this.cantidad_proyectada > 0) {
    this.porcentaje_cumplimiento = Math.round(
      (this.cantidad_ejecutada_total / this.cantidad_proyectada) * 100
    );
  }
  return this.save();
};

programacionSchema.methods.estaCompletada = async function () {
  const registros = await mongoose.model('RegistroDiarioProgramacion').find({
    programacion: this._id,
    estado: 'COMPLETADO',
  });
  return registros.length === 7;
};

programacionSchema.methods.marcarCompletada = async function () {
  this.estado = 'COMPLETADA';
  return this.save();
};

programacionSchema.methods.obtenerRegistrosDiarios = function () {
  return mongoose
    .model('RegistroDiarioProgramacion')
    .find({ programacion: this._id })
    .sort({ fecha: 1 });
};

programacionSchema.methods.obtenerResumen = async function () {
  const registros = await this.obtenerRegistrosDiarios();
  return {
    programacion_id:          this._id,
    contrato:                 this.contrato,
    fecha_inicial:            this.fecha_inicial,
    fecha_final:              this.fecha_final,
    semana:                   this.semana,
    estado:                   this.estado,
    cantidad_proyectada:      this.cantidad_proyectada,
    cantidad_ejecutada_total: this.cantidad_ejecutada_total,
    porcentaje_cumplimiento:  this.porcentaje_cumplimiento,
    registros_diarios: registros.map(r => ({
      fecha:              r.fecha,
      cantidad_ejecutada: r.cantidad_ejecutada,
      estado:             r.estado,
    })),
  };
};

module.exports = mongoose.model('Programacion', programacionSchema);