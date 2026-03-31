import HorasNoTrabajadas from "../models/HorasNoTrabajadas.js";

export const crearHorasNoTrabajadas = async (req, res) => {
  try {
    const nueva = await HorasNoTrabajadas.create(req.body);
    res.status(201).json(nueva);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};