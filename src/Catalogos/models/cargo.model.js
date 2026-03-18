const mongoose = require('mongoose');

const cargoSchema = new mongoose.Schema(
  {
    codigo: {
      type: Number,
      required: [true, 'El código es obligatorio'],
      unique: true,
      min: [1, 'El código debe ser mayor a 0']
    },
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
      maxlength: [100, 'El nombre no puede superar 100 caracteres']
    },
    activo: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

cargoSchema.index({ codigo: 1 }, { unique: true });
cargoSchema.index({ activo: 1 });
cargoSchema.index({ nombre: 'text' });

const Cargo = mongoose.model('Cargo', cargoSchema);

module.exports = Cargo;