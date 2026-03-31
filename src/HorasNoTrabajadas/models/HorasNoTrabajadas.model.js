import mongoose from "mongoose";

const HorasNoTrabajadasSchema = new mongoose.Schema({
  subproyectoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subproyecto",
    required: true
  },
  cuadrillaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cuadrilla",
    required: true
  },
  fecha: {
    type: Date,
    required: true
  },
  horas: {
    type: Number,
    required: true
  },
  motivo: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.model("HorasNoTrabajadas", HorasNoTrabajadasSchema);