/**
 * Seeders para inicialización de usuarios en la base de datos
 * Crear usuarios iniciales: Admin del Sistema y otros roles
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../Auth/models/user.model');
const { ROLES } = require('../config/constants');
const logger = require('../utils/logger');

// Usuarios por defecto a crear
const USUARIOS_INICIALES = [
  {
    nombre: 'Administrador Sistema',
    email: 'admin@efagram.com',
    password: 'Admin123!@#', // Cambiar en producción
    roles: [ROLES.ADMIN_SISTEMA],
    activo: true,
    descripcion: 'Usuario administrador del sistema con acceso completo'
  },
  {
    nombre: 'Talento Humano',
    email: 'rrhh@efagram.com',
    password: 'RRHH123!@#', // Cambiar en producción
    roles: [ROLES.TALENTO_HUMANO],
    activo: true,
    descripcion: 'Usuario de Talento Humano para gestión de personal'
  },
  {
    nombre: 'Supervisor Principal',
    email: 'supervisor@efagram.com',
    password: 'Supervisor123!@#', // Cambiar en producción
    roles: [ROLES.SUPERVISOR],
    activo: true,
    descripcion: 'Usuario supervisor para supervisión de proyectos'
  },
  {
    nombre: 'Jefe de Operaciones',
    email: 'operaciones@efagram.com',
    password: 'Operaciones123!@#', // Cambiar en producción
    roles: [ROLES.JEFE_OPERACIONES],
    activo: true,
    descripcion: 'Usuario Jefe de Operaciones'
  }
];

/**
 * Conectar a la base de datos
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    logger.info(`Conectado a MongoDB: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error('Error conectando a MongoDB:', error.message);
    process.exit(1);
  }
};

/**
 * Crear usuarios iniciales
 */
const crearUsuariosIniciales = async () => {
  try {
    await connectDB();

    logger.info('Iniciando creación de usuarios iniciales...');

    for (const usuarioData of USUARIOS_INICIALES) {
      // Verificar si el usuario ya existe
      const usuarioExistente = await User.findOne({ email: usuarioData.email });

      if (usuarioExistente) {
        logger.warn(`Usuario ya existe: ${usuarioData.email}`);
        continue;
      }

      // Crear nuevo usuario
      const usuario = new User({
        nombre: usuarioData.nombre,
        email: usuarioData.email,
        password: usuarioData.password,
        roles: usuarioData.roles,
        activo: usuarioData.activo
      });

      await usuario.save();

      logger.info(`Usuario creado exitosamente:`, {
        email: usuario.email,
        roles: usuario.roles.join(', '),
        activo: usuario.activo
      });
    }

    logger.info('Seeders completados exitosamente');
    console.log('\n✅ Usuarios iniciales creados correctamente');
    console.log('\nCredenciales creadas:');
    USUARIOS_INICIALES.forEach(usuario => {
      console.log(`  - Email: ${usuario.email}`);
      console.log(`    Contraseña: ${usuario.password}`);
      console.log(`    Rol: ${usuario.roles[0]}`);
      console.log('');
    });

  } catch (error) {
    logger.error('Error en seeders:', error.message);
    console.error('❌ Error en seeders:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info('Desconectado de MongoDB');
  }
};

/**
 * Limpiar todos los usuarios (solo para desarrollo)
 */
const limpiarUsuarios = async () => {
  try {
    await connectDB();

    logger.warn('Eliminando todos los usuarios...');
    const resultado = await User.deleteMany({});

    logger.info(`${resultado.deletedCount} usuarios eliminados`);
    console.log(`✅ ${resultado.deletedCount} usuarios eliminados`);

  } catch (error) {
    logger.error('Error limpiando usuarios:', error.message);
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

/**
 * Resetear base de datos (limpiar y crear nuevos usuarios)
 */
const resetearBaseDatos = async () => {
  try {
    await connectDB();

    logger.warn('Reseteando base de datos de usuarios...');

    // Limpiar usuarios existentes
    const resultado = await User.deleteMany({});
    logger.info(`${resultado.deletedCount} usuarios eliminados`);

    // Crear nuevos usuarios
    for (const usuarioData of USUARIOS_INICIALES) {
      const usuario = new User({
        nombre: usuarioData.nombre,
        email: usuarioData.email,
        password: usuarioData.password,
        roles: usuarioData.roles,
        activo: usuarioData.activo
      });

      await usuario.save();

      logger.info(`Usuario creado: ${usuario.email}`);
    }

    console.log('✅ Base de datos reseteada correctamente');

  } catch (error) {
    logger.error('Error reseteando base de datos:', error.message);
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

/**
 * Main - Ejecutar según argumento
 */
const main = async () => {
  const comando = process.argv[2];

  switch (comando) {
    case 'seed':
      await crearUsuariosIniciales();
      break;
    case 'clean':
      await limpiarUsuarios();
      break;
    case 'reset':
      await resetearBaseDatos();
      break;
    default:
      console.log('Uso: node seeders/user.seeder.js [comando]');
      console.log('\nComandos disponibles:');
      console.log('  seed  - Crear usuarios iniciales');
      console.log('  clean - Eliminar todos los usuarios');
      console.log('  reset - Resetear base de datos (limpiar y crear)');
      console.log('\nEjemplo:');
      console.log('  npm run seed:users');
      console.log('  npm run seed:clean');
      console.log('  npm run seed:reset');
      process.exit(0);
  }
};

// Ejecutar si es el archivo principal
if (require.main === module) {
  main().catch(error => {
    logger.error('Error fatal:', error);
    process.exit(1);
  });
}

module.exports = {
  crearUsuariosIniciales,
  limpiarUsuarios,
  resetearBaseDatos,
  USUARIOS_INICIALES
};
