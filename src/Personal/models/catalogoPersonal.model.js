const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database"); // usa tu conexión real

const CatalogoPersonal = sequelize.define("CatalogoPersonal", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  codigo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  descripcion: {
    type: DataTypes.STRING,
  },
  estado: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: "catalogo_personal",
  timestamps: true,
});

module.exports = CatalogoPersonal;