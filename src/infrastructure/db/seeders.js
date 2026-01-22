require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const { ZONAS, ROLES, TIPOS_NOVEDAD } = require('../../config/constants');

// Importar modelos (cuando los creemos)
// const Zona = require('../../Territorial/models/zona.model');
// const Rol = require('../../Personal/models/rol.model');
// const NovedadTipo = require('../../RegistroDiario/models/novedadTipo.model');

const seedDatabase = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME
    });

    logger.info('Conectado a MongoDB para seeding');

    // ===== ZONAS =====
    logger.info('Creando zonas...');
    
    const zonasData = [
      { codigo: ZONAS.NORTE.codigo, nombre: ZONAS.NORTE.nombre, activa: true },
      { codigo: ZONAS.SUR.codigo, nombre: ZONAS.SUR.nombre, activa: true },
      { codigo: ZONAS.CENTRO.codigo, nombre: ZONAS.CENTRO.nombre, activa: true }
    ];

    // await Zona.insertMany(zonasData);
    logger.info('✅ Zonas creadas');

    // ===== ROLES =====
    logger.info('Creando roles...');
    
    const rolesData = Object.values(ROLES).map(codigo => ({
      codigo,
      descripcion: codigo.replace(/_/g, ' ')
    }));

    // await Rol.insertMany(rolesData);
    logger.info('✅ Roles creados');

    // ===== TIPOS DE NOVEDAD =====
    logger.info('Creando tipos de novedad...');
    
    const novedadesData = Object.values(TIPOS_NOVEDAD).map(codigo => ({
      codigo,
      nombre: codigo
    }));

    // await NovedadTipo.insertMany(novedadesData);
    logger.info('✅ Tipos de novedad creados');

    logger.info('🎉 Seeding completado exitosamente');
    process.exit(0);

  } catch (error) {
    logger.error(`Error en seeding: ${error.message}`);
    process.exit(1);
  }
};

// Ejecutar seeder
seedDatabase();
