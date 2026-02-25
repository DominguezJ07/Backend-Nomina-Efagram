const CatalogoPersonal = require("../models/catalogoPersonal.model");

exports.crear = async (req, res) => {
  try {
    const data = await CatalogoPersonal.create(req.body);
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.listar = async (req, res) => {
  try {
    const data = await CatalogoPersonal.findAll();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};