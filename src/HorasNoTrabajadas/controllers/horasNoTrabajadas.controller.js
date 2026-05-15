const mongoose = require('mongoose');
const HorasNoTrabajadas = require('../models/HorasNoTrabajadas.model');
const Subproyecto = require('../../Proyectos/models/subproyecto.model');


// ✅ CREAR REGISTROs
exports.crear = async (req, res) => {
  try {
    const { subproyectoId, cuadrillaId, fecha, horas, motivo } = req.body;

    // Validaciones básicas
    if (!subproyectoId || !cuadrillaId || !fecha || horas === undefined || !motivo) {
      return res.status(400).json({
        error: 'Todos los campos son obligatorios'
      });
    }

    const subproyecto = await Subproyecto.findById(subproyectoId);

    if (!subproyecto) {
      return res.status(404).json({
        error: 'Subproyecto no existe'
      });
    }

    // 🔥 VALIDACIÓN CLAVE
    if (!subproyecto.cuadrillas || !subproyecto.cuadrillas.includes(cuadrillaId)) {
      return res.status(400).json({
        error: 'La cuadrilla no pertenece a este subproyecto'
      });
    }

    const registro = await HorasNoTrabajadas.create({
      subproyectoId,
      cuadrillaId,
      fecha,
      horas,
      motivo
    });

    res.status(201).json(registro);

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};


// ✅ CONSULTA MENSUAL POR SUBPROYECTO
exports.obtenerPorMes = async (req, res) => {
  try {
    const { subproyectoId, mes, anio } = req.query;

    if (!subproyectoId || !mes || !anio) {
      return res.status(400).json({
        error: 'subproyectoId, mes y anio son requeridos'
      });
    }

    const inicio = new Date(anio, mes - 1, 1);
    const fin = new Date(anio, mes, 0);

    const data = await HorasNoTrabajadas.aggregate([
      {
        $match: {
          subproyectoId: new mongoose.Types.ObjectId(subproyectoId),
          fecha: { $gte: inicio, $lte: fin }
        }
      },
      {
        $group: {
          _id: "$cuadrillaId",
          totalHoras: { $sum: "$horas" }
        }
      }
    ]);

    res.json(data);

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};


// ✅ RESUMEN POR SUBPROYECTO
exports.resumenPorSubproyecto = async (req, res) => {
  try {
    const { subproyectoId } = req.params;

    const resumen = await HorasNoTrabajadas.aggregate([
      {
        $match: {
          subproyectoId: new mongoose.Types.ObjectId(subproyectoId),
        },
      },
      {
        $group: {
          _id: '$cuadrillaId',
          totalHoras: { $sum: '$horas' },
        },
      },
      {
        $lookup: {
          from: 'cuadrillas',
          localField: '_id',
          foreignField: '_id',
          as: 'cuadrilla',
        },
      },
      {
        $unwind: { path: '$cuadrilla', preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          _id: 0,
          cuadrillaId: '$_id',
          nombre: { $ifNull: ['$cuadrilla.nombre', 'Sin nombre'] },
          totalHoras: 1,
        },
      },
    ]);

    res.json({ success: true, data: resumen });
  } catch (error) {
    console.error('Error en resumenPorSubproyecto:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
