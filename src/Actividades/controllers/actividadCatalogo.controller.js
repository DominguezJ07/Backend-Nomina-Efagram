 const Actividad = require('../models/actividadCatalogo.model');

// 🔥 CREAR ACTIVIDAD
exports.createActividad = async (req, res) => {
  try {
    const {
      codigo,
      nombre,
      categoria,
      intervencion,
      estado,
      precioBase,
      descripcion
    } = req.body;

    const nuevaActividad = new Actividad({
      codigo,
      nombre,
      categoria,
      intervencion,
      estado,
      precioBase,
      descripcion
    });

    await nuevaActividad.save();

    res.status(201).json(nuevaActividad);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔥 OBTENER POR INTERVENCIÓN
exports.getByIntervencion = async (req, res) => {
  try {
    const { intervencionId } = req.params;

    const actividades = await Actividad.find({
      intervencion: intervencionId,
      estado: 'Activa'
    });

    res.json(actividades);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};